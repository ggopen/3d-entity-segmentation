class SegmentEngine {
  constructor() {
    this._worker = null;
    this._ready = false;
    this._init();
  }

  _init() {
    const workerCode = this._getWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this._worker = new Worker(workerUrl);
    this._workerUrl = workerUrl;
  }

  _getWorkerCode() {
    return `
      function computeGrayscale(data, width, height) {
        const gray = new Float32Array(width * height);
        let min = 255, max = 0, sum = 0;
        const len = data.length;

        for (let i = 0, j = 0; i < len; i += 4, j++) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) * 0.333333;
          gray[j] = brightness;
          if (brightness < min) min = brightness;
          if (brightness > max) max = brightness;
          sum += brightness;
        }

        return { gray, min, max, mean: sum / (width * height) };
      }

      function computeHistogram(gray, bins) {
        const histogram = new Float32Array(bins);
        const binWidth = 256 / bins;
        for (let i = 0; i < gray.length; i++) {
          const bin = Math.min(bins - 1, Math.floor(gray[i] / binWidth));
          histogram[bin]++;
        }
        return histogram;
      }

      function otsuThreshold(histogram, totalPixels) {
        const bins = histogram.length;
        const binWidth = 256 / bins;
        let sumAll = 0;
        for (let t = 0; t < bins; t++) {
          sumAll += t * histogram[t];
        }

        let sumB = 0, wB = 0, wF = 0;
        let maxVar = 0;
        let threshold = Math.floor(bins / 2);

        for (let t = 0; t < bins; t++) {
          wB += histogram[t];
          if (wB === 0) continue;
          wF = totalPixels - wB;
          if (wF === 0) break;
          sumB += t * histogram[t];
          const mB = sumB / wB;
          const mF = (sumAll - sumB) / wF;
          const diff = mB - mF;
          const between = wB * wF * diff * diff;
          if (between > maxVar) {
            maxVar = between;
            threshold = t;
          }
        }

        return Math.min(255, Math.max(0, Math.floor((threshold + 0.5) * binWidth)));
      }

      function computeLocalContrast(gray, width, height, radius) {
        const contrast = new Float32Array(width * height);
        const r = radius;
        const winSize = (2 * r + 1) * (2 * r + 1);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let localSum = 0;
            let localSumSq = 0;

            for (let dy = -r; dy <= r; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const val = gray[ny * width + nx];
                localSum += val;
                localSumSq += val * val;
              }
            }

            const localMean = localSum / winSize;
            const localVar = (localSumSq / winSize) - (localMean * localMean);
            contrast[y * width + x] = Math.sqrt(Math.max(0, localVar));
          }
        }

        return contrast;
      }

      function generateMask(imageData) {
        const { width, height, data } = imageData;
        const totalPixels = width * height;
        const { gray, min, max, mean } = computeGrayscale(data, width, height);

        const histogram = computeHistogram(gray, 64);
        const brightThreshold = otsuThreshold(histogram, totalPixels);

        const contrast = computeLocalContrast(gray, width, height, 2);

        const contrastThreshold = 8.0;
        const strongContrastThreshold = 20.0;

        const mask = new Uint8Array(totalPixels);

        for (let i = 0; i < totalPixels; i++) {
          const isBright = gray[i] > brightThreshold;
          const hasContrast = contrast[i] > contrastThreshold;
          const hasStrongContrast = contrast[i] > strongContrastThreshold;

          if ((isBright && hasContrast) || hasStrongContrast) {
            mask[i] = 1;
          }
        }

        const cleaned = applyMorphologicalClosing(mask, width, height);

        return removeSmallComponents(cleaned, width, height, 20);
      }

      function applyMorphologicalClosing(mask, width, height) {
        const dilated = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (mask[y * width + x] === 1) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    dilated[ny * width + nx] = 1;
                  }
                }
              }
            }
          }
        }

        const closed = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (dilated[y * width + x] === 1) {
              let count = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (dilated[ny * width + nx] === 1) count++;
                  }
                }
              }
              if (count >= 3) {
                closed[y * width + x] = 1;
              }
            }
          }
        }

        return closed;
      }

      function removeSmallComponents(mask, width, height, minSize) {
        const label = new Int32Array(width * height);
        const labels = [];
        const stack = [];

        for (let i = 0; i < width * height; i++) {
          if (mask[i] === 0 || label[i] !== 0) continue;

          const currentLabel = labels.length + 1;
          let count = 0;
          stack.push(i);
          label[i] = currentLabel;

          while (stack.length > 0) {
            const idx = stack.pop();
            count++;

            const x = idx % width;
            const y = Math.floor(idx / width);

            if (x > 0) {
              const left = idx - 1;
              if (mask[left] === 1 && label[left] === 0) {
                label[left] = currentLabel;
                stack.push(left);
              }
            }
            if (x < width - 1) {
              const right = idx + 1;
              if (mask[right] === 1 && label[right] === 0) {
                label[right] = currentLabel;
                stack.push(right);
              }
            }
            if (y > 0) {
              const up = idx - width;
              if (mask[up] === 1 && label[up] === 0) {
                label[up] = currentLabel;
                stack.push(up);
              }
            }
            if (y < height - 1) {
              const down = idx + width;
              if (mask[down] === 1 && label[down] === 0) {
                label[down] = currentLabel;
                stack.push(down);
              }
            }
          }

          labels.push(count);
        }

        const result = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
          if (label[i] > 0 && labels[label[i] - 1] >= minSize) {
            result[i] = 1;
          }
        }

        return result;
      }

      self.onmessage = function(e) {
        const msg = e.data;

        if (msg.type === 'init') {
          self.postMessage({ type: 'ready', data: { success: true } });
        } else if (msg.type === 'segment') {
          try {
            const mask = generateMask(msg.imageData);
            self.postMessage({
              type: 'result',
              data: {
                mask: mask,
                width: msg.imageData.width,
                height: msg.imageData.height,
                viewType: msg.viewType
              }
            });
          } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
          }
        } else if (msg.type === 'segmentBatch') {
          try {
            const results = [];
            for (const item of msg.items) {
              const mask = generateMask(item.imageData);
              results.push({
                mask: mask,
                width: item.imageData.width,
                height: item.imageData.height,
                viewType: item.viewType
              });
            }
            self.postMessage({ type: 'batchResult', data: results });
          } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
          }
        }
      };
    `;
  }

  async init() {
    return new Promise((resolve) => {
      if (this._ready) {
        resolve(true);
        return;
      }

      const handler = (e) => {
        const msg = e.data;
        if (msg.type === 'ready') {
          this._ready = msg.data.success;
          this._worker.removeEventListener('message', handler);
          resolve(msg.data.success);
        } else if (msg.type === 'error') {
          this._worker.removeEventListener('message', handler);
          resolve(false);
        }
      };

      this._worker.addEventListener('message', handler);
      this._worker.postMessage({ type: 'init' });
    });
  }

  async segmentMultiView(renderResults) {
    if (!this._ready) {
      await this.init();
    }

    const masks = [];

    for (const result of renderResults) {
      const maskResult = await this._segmentSingleView(result);
      masks.push({
        viewType: result.viewType,
        viewDir: result.viewDir,
        mask: maskResult.data,
        width: maskResult.width,
        height: maskResult.height,
        pixelMapping: result.pixelMapping,
        cameraMatrix: result.cameraMatrix,
        rect: result.rect
      });
    }

    return masks;
  }

  async _segmentSingleView(renderResult) {
    const { image, width, height, viewType, rect } = renderResult;

    let processingWidth = width;
    let processingHeight = height;
    let imageData;

    if (rect) {
      const rx = Math.max(0, Math.floor(rect.x));
      const ry = Math.max(0, Math.floor(rect.y));
      const rw = Math.min(width - rx, Math.floor(rect.width));
      const rh = Math.min(height - ry, Math.floor(rect.height));

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = rw;
      tempCanvas.height = rh;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(image, rx, ry, rw, rh, 0, 0, rw, rh);
      imageData = ctx.getImageData(0, 0, rw, rh);
      processingWidth = rw;
      processingHeight = rh;
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      imageData = ctx.getImageData(0, 0, width, height);
    }

    return new Promise((resolve) => {
      const handler = (e) => {
        const msg = e.data;
        if (msg.type === 'result') {
          this._worker.removeEventListener('message', handler);
          resolve({
            data: msg.data.mask,
            width: msg.data.width,
            height: msg.data.height
          });
        } else if (msg.type === 'error') {
          this._worker.removeEventListener('message', handler);
          resolve({
            data: new Uint8Array(processingWidth * processingHeight),
            width: processingWidth,
            height: processingHeight
          });
        }
      };

      this._worker.addEventListener('message', handler);
      this._worker.postMessage({
        type: 'segment',
        imageData: {
          width: imageData.width,
          height: imageData.height,
          data: imageData.data
        },
        viewType: viewType
      });
    });
  }

  clear() {
  }

  destroy() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    if (this._workerUrl) {
      URL.revokeObjectURL(this._workerUrl);
      this._workerUrl = null;
    }
    this._ready = false;
  }
}

export default SegmentEngine;