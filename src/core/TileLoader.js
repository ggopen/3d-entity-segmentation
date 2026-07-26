class TileLoader {
  constructor(viewer) {
    this.viewer = viewer;
    this.tileset = null;
    this._currentTriangles = [];
    this._tileLoadProgress = 0;
    this._onTilesReady = null;
  }

  async load(url) {
    this.clear();

    setStatus('正在获取瓦片配置...');
    showLoading('加载瓦片数据...');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      }

      const tilesetJson = await response.json();
      console.log('Tileset JSON loaded:', tilesetJson.asset?.version, 'root:', !!tilesetJson.root);

      setStatus('正在初始化三维瓦片...');

      return new Promise((resolve, reject) => {
        try {
          const tileset = new Cesium.Cesium3DTileset({
            url: url,
            maximumScreenSpaceError: 16,
            skipLevelOfDetail: true,
            baseScreenSpaceError: 1024
          });

          this.tileset = tileset;

          tileset.initialTilesLoaded.addEventListener(() => {
            setStatus('瓦片基础层级加载完成');
            hideLoading();
          });

          tileset.allTilesLoaded.addEventListener(() => {
            console.log('All tiles loaded');
            setStatus('所有瓦片加载完成');
          });

          tileset.tileFailed.addEventListener((error) => {
            console.warn('Tile failed:', error);
          });

          this.viewer.viewer.scene.primitives.add(tileset);

          if (tileset.boundingSphere) {
            const radius = Math.max(tileset.boundingSphere.radius, 100);
            this.viewer.viewer.camera.flyToBoundingSphere(tileset.boundingSphere, {
              duration: 2,
              offset: new Cesium.HeadingPitchRange(
                0,
                Cesium.Math.toRadians(-30),
                radius * 2
              )
            });
          }

          let checkCount = 0;
          const checkTiles = () => {
            if (this.tileset && !this.tileset.isDestroyed()) {
              checkCount++;
              const stats = this._countTiles(this.tileset);
              this.viewer.updateTileCount(stats);

              if (checkCount % 30 === 0) {
                this._extractTriangleData(this.tileset);
              }
            }
            requestAnimationFrame(checkTiles);
          };
          checkTiles();

          setTimeout(() => {
            this._extractTriangleData(this.tileset);
            resolve(tileset);
          }, 5000);

          setTimeout(() => {
            resolve(tileset);
          }, 15000);

        } catch (err) {
          reject(err);
        }
      });

    } catch (err) {
      console.error('Tile load failed:', err);
      hideLoading();
      setStatus('瓦片加载失败: ' + err.message);
      throw err;
    }
  }

  _countTiles(tileset) {
    let count = 0;
    const traverse = (tile) => {
      if (!tile) return;
      count++;
      if (tile._children) {
        for (const child of tile._children) {
          if (child) traverse(child);
        }
      }
    };
    if (tileset._root) traverse(tileset._root);
    return count;
  }

  _extractTriangleData(tileset) {
    if (!tileset._root) return;
    if (this._extracting) return;
    this._extracting = true;

    const triangles = [];
    const processTile = (tile) => {
      if (!tile || !tile.content) return;

      try {
        const content = tile.content._content || tile.content;
        if (!content) return;

        const primitive = content._primitive || content;
        if (!primitive || !primitive.geometry) return;

        const positions = primitive.geometry.getAttribute('position');
        const indices = primitive.geometry.getIndex();

        if (!positions || !indices) return;

        const posArr = positions.array;
        const idxArr = indices.array;

        const transform = tile._boundingVolumeCenter
          ? Cesium.Matrix4.fromTranslation(tile._boundingVolumeCenter)
          : null;

        for (let i = 0; i < idxArr.length; i += 3) {
          const i0 = idxArr[i] * 3;
          const i1 = idxArr[i + 1] * 3;
          const i2 = idxArr[i + 2] * 3;

          if (i0 + 2 >= posArr.length) continue;

          const v0 = new Cesium.Cartesian3(posArr[i0], posArr[i0 + 1], posArr[i0 + 2]);
          const v1 = new Cesium.Cartesian3(posArr[i1], posArr[i1 + 1], posArr[i1 + 2]);
          const v2 = new Cesium.Cartesian3(posArr[i2], posArr[i2 + 1], posArr[i2 + 2]);

          const wv0 = transform ? Cesium.Matrix4.multiplyByPoint(transform, v0, new Cesium.Cartesian3()) : v0;
          const wv1 = transform ? Cesium.Matrix4.multiplyByPoint(transform, v1, new Cesium.Cartesian3()) : v1;
          const wv2 = transform ? Cesium.Matrix4.multiplyByPoint(transform, v2, new Cesium.Cartesian3()) : v2;

          triangles.push({
            vertices: [wv0, wv1, wv2],
            tileId: tile._id || 'unknown',
            center: new Cesium.Cartesian3(
              (wv0.x + wv1.x + wv2.x) / 3,
              (wv0.y + wv1.y + wv2.y) / 3,
              (wv0.z + wv1.z + wv2.z) / 3
            )
          });
        }
      } catch (e) {
      }

      if (tile._children) {
        for (const child of tile._children) {
          if (child) processTile(child);
        }
      }
    };

    processTile(tileset._root);
    this._currentTriangles = triangles;
    this._extracting = false;
  }

  getCurrentTiles() {
    return this._currentTriangles || [];
  }

  getVisibleTriangles() {
    return this._currentTriangles || [];
  }

  clear() {
    if (this.tileset) {
      this.viewer.viewer.scene.primitives.remove(this.tileset);
      this.tileset = null;
    }
    this._currentTriangles = [];
  }

  isLoaded() {
    return this.tileset !== null;
  }

  getBoundingSphere() {
    if (this.tileset && this.tileset.boundingSphere) {
      return this.tileset.boundingSphere;
    }
    return null;
  }
}

function setStatus(text) {
  const el = document.getElementById('statusText');
  if (el) el.textContent = text;
}

function showLoading(text) {
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingText');
  if (overlay && textEl) {
    overlay.style.display = 'block';
    textEl.textContent = text || '处理中...';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

export default TileLoader;
