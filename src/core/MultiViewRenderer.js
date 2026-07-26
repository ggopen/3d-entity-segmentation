import * as Cesium from 'cesium';

class MultiViewRenderer {
  constructor(viewer) {
    this.viewer = viewer;
    this._originalCameraState = null;
  }

  getView(viewType) {
    const viewports = {
      top: { label: '俯视', dir: 'top' },
      angle: { label: '斜45°', dir: 'angle' },
      front: { label: '平视', dir: 'front' }
    };
    return viewports[viewType] || viewports.angle;
  }

  getViewWithRect(viewType, rect) {
    const view = this.getView(viewType);
    return { ...view, rect: rect };
  }

  async renderViews(viewports) {
    this._saveOriginalCamera();
    const results = [];

    for (const vp of viewports) {
      try {
        const result = await this._renderSingleView(vp);
        results.push(result);
      } catch (err) {
        console.error('Failed to render view:', vp.dir, err);
        const canvas = this.viewer.getCanvas();
        results.push({
          viewType: vp.label,
          viewDir: vp.dir,
          image: this._createBlankCanvas(canvas.width, canvas.height),
          depthMap: null,
          pixelMapping: new Int32Array(canvas.width * canvas.height).fill(-1),
          cameraMatrix: this.viewer.getCameraMatrix(),
          width: canvas.width,
          height: canvas.height,
          rect: vp.rect || null
        });
      }
    }

    this._restoreOriginalCamera();
    return results;
  }

  _saveOriginalCamera() {
    const camera = this.viewer.viewer.camera;
    this._originalCameraState = {
      position: camera.position.clone(),
      direction: camera.direction.clone(),
      up: camera.up.clone(),
      right: camera.right.clone()
    };
  }

  _restoreOriginalCamera() {
    if (this._originalCameraState) {
      const camera = this.viewer.viewer.camera;
      camera.setView({
        destination: this._originalCameraState.position,
        orientation: {
          direction: this._originalCameraState.direction,
          up: this._originalCameraState.up
        }
      });
      this._originalCameraState = null;
    }
  }

  async _renderSingleView(vp) {
    const canvas = this.viewer.getCanvas();
    const width = canvas.width;
    const height = canvas.height;

    const camera = this.viewer.viewer.camera;
    this._setCameraForView(camera, vp);

    await this._waitForRender(5);

    const screenshot = this.viewer.screenshot();
    const depthMap = this._captureDepthMap();
    const pixelMapping = this._buildPixelTriangleMapping(camera, width, height);
    const cameraMatrix = this.viewer.getCameraMatrix();

    return {
      viewType: vp.label,
      viewDir: vp.dir,
      image: screenshot,
      depthMap: depthMap,
      pixelMapping: pixelMapping,
      cameraMatrix: cameraMatrix,
      width: width,
      height: height,
      rect: vp.rect || null
    };
  }

  _setCameraForView(camera, vp) {
    const center = this._getSceneCenter();
    const centerCart = Cesium.Cartesian3.fromDegrees(
      center.lon, center.lat, center.height
    );

    switch (vp.dir) {
      case 'top': {
        const height = 500;
        camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            center.lon, center.lat, height
          ),
          orientation: {
            direction: new Cesium.Cartesian3(0, 0, -1),
            up: new Cesium.Cartesian3(0, 1, 0)
          }
        });
        break;
      }
      case 'angle': {
        const dist = 600;
        const eye = Cesium.Cartesian3.fromDegrees(
          center.lon - 0.003, center.lat - 0.003, center.height + dist
        );
        const dir = Cesium.Cartesian3.subtract(
          centerCart, eye, new Cesium.Cartesian3()
        );
        Cesium.Cartesian3.normalize(dir, dir);
        camera.setView({
          destination: eye,
          orientation: {
            direction: dir,
            up: new Cesium.Cartesian3(0, 0, 1)
          }
        });
        break;
      }
      case 'front': {
        const dist = 500;
        const eye = Cesium.Cartesian3.fromDegrees(
          center.lon, center.lat - 0.005, center.height + 100
        );
        const dir = Cesium.Cartesian3.subtract(
          centerCart, eye, new Cesium.Cartesian3()
        );
        Cesium.Cartesian3.normalize(dir, dir);
        camera.setView({
          destination: eye,
          orientation: {
            direction: dir,
            up: new Cesium.Cartesian3(0, 0, 1)
          }
        });
        break;
      }
      default:
        break;
    }
  }

  _getSceneCenter() {
    const scene = this.viewer.getScene();
    const primitives = scene.primitives;

    for (let i = 0; i < primitives.length; i++) {
      const p = primitives.get(i);
      if (p && p.boundingSphere) {
        const center = p.boundingSphere.center;
        const carto = Cesium.Cartographic.fromCartesian(center);
        return {
          lon: Cesium.Math.toDegrees(carto.longitude),
          lat: Cesium.Math.toDegrees(carto.latitude),
          height: carto.height
        };
      }
    }

    const camera = this.viewer.viewer.camera;
    const carto = Cesium.Cartographic.fromCartesian(camera.position);
    return {
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      height: carto.height
    };
  }

  _waitForRender(frames) {
    return new Promise((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count >= frames) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }

  _captureDepthMap() {
    const scene = this.viewer.getScene();
    const depthTexture = scene.depthTexture;
    if (!depthTexture) return null;

    try {
      const context = scene.context;
      const gl = context.gl;
      const width = depthTexture.width;
      const height = depthTexture.height;

      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D, depthTexture, 0
      );

      const depthData = new Float32Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, depthData);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(framebuffer);

      const depthArray = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        depthArray[i] = depthData[i * 4];
      }

      return {
        data: depthArray,
        width: width,
        height: height
      };
    } catch (e) {
      return null;
    }
  }

  _buildPixelTriangleMapping(camera, width, height) {
    const mapping = new Int32Array(width * height).fill(-1);

    const scene = this.viewer.getScene();
    const primitives = scene.primitives;
    let tileset = null;

    for (let i = 0; i < primitives.length; i++) {
      const p = primitives.get(i);
      if (p && p._root) {
        tileset = p;
        break;
      }
    }

    if (!tileset || !tileset._root) return mapping;

    const frustum = camera.frustum;
    const forward = camera.direction;
    const right = camera.right;
    const up = camera.up;
    const camPos = camera.position;
    const fov = frustum.fov;
    const aspect = width / height;

    const processTile = (tile, tileTriangleStart) => {
      if (!tile || !tile.content) return 0;

      let triangleCount = 0;

      try {
        const content = tile.content._content || tile.content;
        if (!content) return 0;

        const primitive = content._primitive || content;
        if (!primitive || !primitive.geometry) return 0;

        const positions = primitive.geometry.getAttribute('position');
        const indices = primitive.geometry.getIndex();

        if (!positions || !indices) return 0;

        const posArr = positions.array;
        const idxArr = indices.array;

        const transform = tile._boundingVolumeCenter
          ? Cesium.Matrix4.fromTranslation(tile._boundingVolumeCenter)
          : null;

        for (let i = 0; i < idxArr.length; i += 3) {
          const i0 = idxArr[i] * 3;
          const i1 = idxArr[i + 1] * 3;
          const i2 = idxArr[i + 2] * 3;

          if (i0 + 2 >= posArr.length || i1 + 2 >= posArr.length || i2 + 2 >= posArr.length) {
            continue;
          }

          const v0 = new Cesium.Cartesian3(
            posArr[i0], posArr[i0 + 1], posArr[i0 + 2]
          );
          const v1 = new Cesium.Cartesian3(
            posArr[i1], posArr[i1 + 1], posArr[i1 + 2]
          );
          const v2 = new Cesium.Cartesian3(
            posArr[i2], posArr[i2 + 1], posArr[i2 + 2]
          );

          const wv0 = transform
            ? Cesium.Matrix4.multiplyByPoint(transform, v0, new Cesium.Cartesian3())
            : v0;
          const wv1 = transform
            ? Cesium.Matrix4.multiplyByPoint(transform, v1, new Cesium.Cartesian3())
            : v1;
          const wv2 = transform
            ? Cesium.Matrix4.multiplyByPoint(transform, v2, new Cesium.Cartesian3())
            : v2;

          const v0Rel = Cesium.Cartesian3.subtract(wv0, camPos, new Cesium.Cartesian3());
          const v1Rel = Cesium.Cartesian3.subtract(wv1, camPos, new Cesium.Cartesian3());
          const v2Rel = Cesium.Cartesian3.subtract(wv2, camPos, new Cesium.Cartesian3());

          const d0 = Cesium.Cartesian3.dot(v0Rel, forward);
          const d1 = Cesium.Cartesian3.dot(v1Rel, forward);
          const d2 = Cesium.Cartesian3.dot(v2Rel, forward);

          if (d0 < 0 && d1 < 0 && d2 < 0) continue;

          const maxD = Math.max(d0, d1, d2);
          const minD = Math.min(d0, d1, d2);

          if (maxD < 0 || minD > 10000) continue;

          const centroid = new Cesium.Cartesian3(
            (wv0.x + wv1.x + wv2.x) / 3,
            (wv0.y + wv1.y + wv2.y) / 3,
            (wv0.z + wv1.z + wv2.z) / 3
          );

          const rel = Cesium.Cartesian3.subtract(centroid, camPos, new Cesium.Cartesian3());
          const depth = Cesium.Cartesian3.dot(rel, forward);

          if (depth <= 0) continue;

          const rightComp = Cesium.Cartesian3.dot(rel, right);
          const upComp = Cesium.Cartesian3.dot(rel, up);

          const tanHalfFov = Math.tan(fov / 2);
          const tanHalfFovX = tanHalfFov * aspect;

          const screenX = (rightComp / (depth * tanHalfFovX) + 1) / 2;
          const screenY = 1 - (upComp / (depth * tanHalfFov) + 1) / 2;

          const px = Math.floor(screenX * width);
          const py = Math.floor(screenY * height);

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = py * width + px;
            mapping[idx] = tileTriangleStart + triangleCount;
          }

          triangleCount++;
        }
      } catch (e) {
      }

      if (tile._children && tile._children.length > 0) {
        for (const child of tile._children) {
          if (child) {
            triangleCount += processTile(child, tileTriangleStart + triangleCount);
          }
        }
      }

      return triangleCount;
    };

    if (tileset._root) {
      processTile(tileset._root, 0);
    }

    return mapping;
  }

  _createBlankCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, width, height);
    return canvas;
  }
}

export default MultiViewRenderer;