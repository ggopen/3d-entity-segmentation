class BackProjector {
  constructor(viewer) {
    this.viewer = viewer;
    this._pixelTriangleMap = null;
  }

  projectTo3D(renderResults, masks, triangles) {
    const projectedTriangles = new Map();

    for (let i = 0; i < masks.length; i++) {
      const maskData = masks[i];
      const renderResult = renderResults[i];

      const viewTriangles = this._projectViewMask(
        maskData,
        renderResult,
        triangles
      );

      this._mergeTriangleSets(projectedTriangles, viewTriangles);
    }

    return Array.from(projectedTriangles.values());
  }

  _projectViewMask(maskData, renderResult, allTriangles) {
    const { mask, width, height, pixelMapping, cameraMatrix } = maskData;
    const projected = new Map();

    const maskWidth = maskData.width;
    const maskHeight = maskData.height;

    for (let y = 0; y < maskHeight; y++) {
      for (let x = 0; x < maskWidth; x++) {
        if (mask[y * maskWidth + x] === 1) {
          let px = x;
          let py = y;

          if (maskWidth !== width || maskHeight !== height) {
            px = Math.floor(x * width / maskWidth);
            py = Math.floor(y * height / maskHeight);
          }

          const mappingIdx = py * width + px;
          const triangleIdx = pixelMapping[mappingIdx];

          if (triangleIdx >= 0 && triangleIdx < allTriangles.length) {
            projected.set(triangleIdx, allTriangles[triangleIdx]);
          }
        }
      }
    }

    return projected;
  }

  _mergeTriangleSets(target, source) {
    for (const [key, value] of source) {
      if (!target.has(key)) {
        target.set(key, value);
      }
    }
  }

  fuseMultiViewMasks(masks) {
    if (!masks || masks.length === 0) return null;
    if (masks.length === 1) return masks[0];

    const reference = masks[0];
    const fused = new Uint8Array(reference.width * reference.height);

    for (const mask of masks) {
      if (mask.width === reference.width && mask.height === reference.height) {
        for (let i = 0; i < fused.length; i++) {
          if (mask.mask[i] === 1) {
            fused[i] = 1;
          }
        }
      } else {
        const scaleX = reference.width / mask.width;
        const scaleY = reference.height / mask.height;

        for (let y = 0; y < mask.height; y++) {
          for (let x = 0; x < mask.width; x++) {
            if (mask.mask[y * mask.width + x] === 1) {
              const rx = Math.floor(x * scaleX);
              const ry = Math.floor(y * scaleY);
              if (rx >= 0 && rx < reference.width && ry >= 0 && ry < reference.height) {
                fused[ry * reference.width + rx] = 1;
              }
            }
          }
        }
      }
    }

    return {
      data: fused,
      width: reference.width,
      height: reference.height
    };
  }

  pixelsToWorld(maskPoints, cameraMatrix) {
    const { view, projection, position, direction, up, right } = cameraMatrix;
    const worldPoints = [];

    for (const point of maskPoints) {
      const depth = point.depth || 100;

      const x = (point.x / point.width) * 2 - 1;
      const y = 1 - (point.y / point.height) * 2;

      const clipPoint = new Cesium.Cartesian4(x, y, -1, 1);
      const viewPoint = Cesium.Matrix4.multiplyByPoint(
        Cesium.Matrix4.inverse(projection, new Cesium.Matrix4()),
        clipPoint,
        new Cesium.Cartesian4()
      );
      viewPoint.x /= viewPoint.w;
      viewPoint.y /= viewPoint.w;
      viewPoint.z /= viewPoint.w;

      const worldPoint = new Cesium.Cartesian3(
        position.x + direction.x * depth + right.x * viewPoint.x + up.x * viewPoint.y,
        position.y + direction.y * depth + right.y * viewPoint.x + up.y * viewPoint.y,
        position.z + direction.z * depth + right.z * viewPoint.x + up.z * viewPoint.y
      );

      worldPoints.push(worldPoint);
    }

    return worldPoints;
  }

  computeTriangleCenters(triangles) {
    return triangles.map(tri => {
      const v0 = tri.vertices[0];
      const v1 = tri.vertices[1];
      const v2 = tri.vertices[2];

      return new Cesium.Cartesian3(
        (v0.x + v1.x + v2.x) / 3,
        (v0.y + v1.y + v2.y) / 3,
        (v0.z + v1.z + v2.z) / 3
      );
    });
  }
}

export default BackProjector;
