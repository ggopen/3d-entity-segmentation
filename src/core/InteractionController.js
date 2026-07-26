class InteractionController {
  constructor(viewer) {
    this.viewer = viewer;
    this._rectMode = false;
    this._startPoint = null;
    this._endPoint = null;
    this._rectCanvas = null;
    this._rectCtx = null;
    this._onRectSelectCallback = null;
    this._handler = null;
    this._pickHandler = null;
    this._resizeHandler = null;
    this._keyHandler = null;

    this._initRectCanvas();
    this._initHandlers();
  }

  _initRectCanvas() {
    const containerId = this.viewer.containerId;
    const container = document.getElementById(containerId);

    this._rectCanvas = document.getElementById('rectCanvas');
    if (!this._rectCanvas) {
      this._rectCanvas = document.createElement('canvas');
      this._rectCanvas.id = 'rectCanvas';
      this._rectCanvas.style.position = 'absolute';
      this._rectCanvas.style.top = '0';
      this._rectCanvas.style.left = '0';
      this._rectCanvas.style.cursor = 'crosshair';
      this._rectCanvas.style.display = 'none';
      this._rectCanvas.style.zIndex = '10';
      this._rectCanvas.style.pointerEvents = 'auto';

      if (container) {
        container.style.position = container.style.position || 'relative';
        container.appendChild(this._rectCanvas);
      } else {
        document.body.appendChild(this._rectCanvas);
      }
    }

    this._rectCtx = this._rectCanvas.getContext('2d');
  }

  _initHandlers() {
    this._handler = new Cesium.ScreenSpaceEventHandler(this._rectCanvas);

    this._handler.setInputAction((movement) => {
      if (!this._rectMode) return;
      this._startPoint = {
        x: movement.endPosition.x,
        y: movement.endPosition.y
      };
      this._endPoint = null;
      this._clearRect();
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    this._handler.setInputAction((movement) => {
      if (!this._rectMode || !this._startPoint) return;
      this._endPoint = {
        x: movement.endPosition.x,
        y: movement.endPosition.y
      };
      this._drawRect();
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this._handler.setInputAction(() => {
      if (!this._rectMode) return;
      if (!this._startPoint || !this._endPoint) {
        this._cancelRect();
        return;
      }

      const rect = this._getNormalizedRect();
      this._clearRect();
      this._startPoint = null;
      this._endPoint = null;

      if (this._onRectSelectCallback && rect) {
        this._onRectSelectCallback(rect);
      }

      this._rectMode = false;
      this._rectCanvas.style.display = 'none';
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    this._handler.setInputAction(() => {
      if (!this._rectMode) return;
      this._cancelRect();
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

    this._resizeHandler = () => this._updateCanvasSize();
    window.addEventListener('resize', this._resizeHandler);

    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this._rectMode) {
        this._cancelRect();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _updateCanvasSize() {
    if (!this._rectCanvas) return;

    const containerId = this.viewer.containerId;
    const container = document.getElementById(containerId);
    const canvas = this.viewer.getCanvas();

    if (container) {
      const rect = container.getBoundingClientRect();
      this._rectCanvas.width = canvas.width;
      this._rectCanvas.height = canvas.height;
      this._rectCanvas.style.width = rect.width + 'px';
      this._rectCanvas.style.height = rect.height + 'px';
    } else {
      this._rectCanvas.width = canvas.width;
      this._rectCanvas.height = canvas.height;
    }
  }

  setRectMode(enabled) {
    this._rectMode = enabled;
    if (enabled) {
      this._updateCanvasSize();
      this._rectCanvas.style.display = 'block';
      this._startPoint = null;
      this._endPoint = null;
      this._clearRect();
    } else {
      this._rectCanvas.style.display = 'none';
      this._clearRect();
      this._startPoint = null;
      this._endPoint = null;
    }
  }

  onRectSelect(callback) {
    this._onRectSelectCallback = callback;
  }

  _drawRect() {
    if (!this._startPoint || !this._endPoint) return;

    const ctx = this._rectCtx;
    ctx.clearRect(0, 0, this._rectCanvas.width, this._rectCanvas.height);

    const x = Math.min(this._startPoint.x, this._endPoint.x);
    const y = Math.min(this._startPoint.y, this._endPoint.y);
    const w = Math.abs(this._endPoint.x - this._startPoint.x);
    const h = Math.abs(this._endPoint.y - this._startPoint.y);

    ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _clearRect() {
    if (this._rectCtx) {
      this._rectCtx.clearRect(0, 0, this._rectCanvas.width, this._rectCanvas.height);
    }
  }

  _cancelRect() {
    this._clearRect();
    this._startPoint = null;
    this._endPoint = null;
    this._rectMode = false;
    this._rectCanvas.style.display = 'none';
  }

  _getNormalizedRect() {
    if (!this._startPoint || !this._endPoint) return null;

    const x = Math.min(this._startPoint.x, this._endPoint.x);
    const y = Math.min(this._startPoint.y, this._endPoint.y);
    const w = Math.abs(this._endPoint.x - this._startPoint.x);
    const h = Math.abs(this._endPoint.y - this._startPoint.y);

    if (w < 5 || h < 5) return null;

    const canvas = this.viewer.getCanvas();

    return {
      x: x / canvas.width,
      y: y / canvas.height,
      width: w / canvas.width,
      height: h / canvas.height,
      pixelRect: { x: x, y: y, width: w, height: h }
    };
  }

  getScreenRect() {
    return this._getNormalizedRect();
  }

  screenToWorld(screenX, screenY) {
    const viewer = this.viewer.viewer;
    const ray = viewer.camera.getPickRay(
      new Cesium.Cartesian2(screenX, screenY)
    );
    if (!ray) return null;

    const intersection = viewer.scene.globe.pick(
      ray,
      viewer.scene.globe.ellipsoid
    );
    return intersection;
  }

  onEntityClick(callback) {
    this.removeEntityClickHandler();

    this._pickHandler = new Cesium.ScreenSpaceEventHandler(
      this.viewer.viewer.scene.canvas
    );
    this._pickHandler.setInputAction((click) => {
      if (this._rectMode) return;

      const picked = this.viewer.viewer.scene.pick(click.position);
      if (picked && picked.primitive) {
        callback(picked);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  removeEntityClickHandler() {
    if (this._pickHandler) {
      this._pickHandler.destroy();
      this._pickHandler = null;
    }
  }

  getCurrentViewBounds() {
    const viewer = this.viewer.viewer;
    const rectangle = viewer.camera.computeViewRectangle();
    if (rectangle) {
      return {
        west: Cesium.Math.toDegrees(rectangle.west),
        east: Cesium.Math.toDegrees(rectangle.east),
        south: Cesium.Math.toDegrees(rectangle.south),
        north: Cesium.Math.toDegrees(rectangle.north)
      };
    }
    return null;
  }

  destroy() {
    this.setRectMode(false);

    if (this._handler) {
      this._handler.destroy();
      this._handler = null;
    }

    this.removeEntityClickHandler();

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    if (this._rectCanvas && this._rectCanvas.parentNode) {
      this._rectCanvas.parentNode.removeChild(this._rectCanvas);
    }
    this._rectCanvas = null;
    this._rectCtx = null;
  }
}

export default InteractionController;