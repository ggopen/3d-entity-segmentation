class Viewer {
  constructor(containerId) {
    this.containerId = containerId;
    this._tileCount = 0;
    this._fpsFrames = 0;
    this._fpsLastTime = performance.now();
    this._fpsInterval = null;
    this._onTileCountChange = null;
    this._onFPSUpdate = null;

    this._checkWebGL();
    this._initViewer();
    this._setupFPSCounter();
  }

  _checkWebGL() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('您的浏览器或硬件不支持 WebGL，无法运行三维引擎。请使用最新版 Chrome、Firefox 或 Edge 浏览器，并确保显卡驱动已更新。');
    }
  }

  _initViewer() {
    Cesium.Ion.defaultAccessToken = '';

    this.viewer = new Cesium.Viewer(this.containerId, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
      imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        subdomains: ['1', '2', '3', '4'],
        maximumLevel: 18,
        credit: ''
      }),
      terrain: undefined
    });

    this.viewer.scene.globe.enableLighting = false;
    this.viewer.scene.skyAtmosphere.show = false;
    this.viewer.scene.fog.enabled = false;
    this.viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0e14');
    this.viewer.scene.globe.showGroundAtmosphere = false;
    this.viewer.scene.synchronicBlockedFrames = 0;
    this.viewer.clock.shouldAnimate = true;
    this.viewer.scene.postProcessStages.fxaa.enabled = true;

    const canvas = this.viewer.scene.canvas;
    canvas.style.pointerEvents = 'auto';
    canvas.style.cursor = 'grab';
    this._originalCursor = canvas.style.cursor;

    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 500)
    });

    this._setupInputHandlers();
  }

  _setupInputHandlers() {
    const handler = this.viewer.screenSpaceEventHandler;
    const eventsToRemove = [
      Cesium.ScreenSpaceEventType.LEFT_DOWN,
      Cesium.ScreenSpaceEventType.LEFT_UP,
      Cesium.ScreenSpaceEventType.RIGHT_DOWN,
      Cesium.ScreenSpaceEventType.RIGHT_UP,
      Cesium.ScreenSpaceEventType.MIDDLE_DOWN,
      Cesium.ScreenSpaceEventType.MIDDLE_UP,
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
      Cesium.ScreenSpaceEventType.WHEEL,
      Cesium.ScreenSpaceEventType.PINCH_START,
      Cesium.ScreenSpaceEventType.PINCH_MOVE,
      Cesium.ScreenSpaceEventType.PINCH_END
    ];

    for (const eventType of eventsToRemove) {
      handler.removeInputAction(eventType);
    }
  }

  _setupFPSCounter() {
    this._fpsInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this._fpsLastTime;
      const fps = (this._fpsFrames / elapsed) * 1000;
      this._fpsFrames = 0;
      this._fpsLastTime = now;
      if (this._onFPSUpdate) {
        this._onFPSUpdate(fps);
      }
    }, 1000);

    this.viewer.scene.postRender.addEventListener(() => {
      this._fpsFrames++;
    });
  }

  getCanvas() {
    return this.viewer.scene.canvas;
  }

  getWidth() {
    return this.viewer.scene.canvas.width;
  }

  getHeight() {
    return this.viewer.scene.canvas.height;
  }

  getScene() {
    return this.viewer.scene;
  }

  getCameraMatrix() {
    const camera = this.viewer.camera;
    return {
      view: camera.viewMatrix.clone(),
      projection: camera.frustum.projectionMatrix.clone(),
      inverseView: camera.inverseViewMatrix.clone(),
      position: camera.position.clone(),
      direction: camera.direction.clone(),
      up: camera.up.clone(),
      right: camera.right.clone()
    };
  }

  screenshot() {
    const canvas = this.viewer.scene.canvas;
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = canvas.height;
    const ctx = tmpCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    return tmpCanvas;
  }

  flyHome() {
    this.viewer.camera.flyHome(1.5);
  }

  flyToEntity(entity) {
    if (!entity || !entity.boundingBox) return;
    const center = entity.boundingBox.center;
    const bbox = entity.boundingBox;

    const centerCartesian = Cesium.Cartesian3.fromDegrees(
      center[0], center[1], center[2]
    );
    const size = Math.max(
      bbox.max[0] - bbox.min[0],
      bbox.max[1] - bbox.min[1],
      bbox.max[2] - bbox.min[2]
    );
    const distance = size * 3;

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        center[0], center[1] - 0.001, center[2] + distance
      ),
      duration: 1.5
    });
  }

  setViewByDirection(directionType, centerPosition) {
    const camera = this.viewer.camera;
    let dir, up;

    switch (directionType) {
      case 'top':
        dir = new Cesium.Cartesian3(0, 0, -1);
        up = new Cesium.Cartesian3(0, 1, 0);
        break;
      case 'angle':
        dir = new Cesium.Cartesian3(-1, -1, -1);
        up = new Cesium.Cartesian3(0, 0, 1);
        break;
      case 'front':
        dir = new Cesium.Cartesian3(0, -1, 0);
        up = new Cesium.Cartesian3(0, 0, 1);
        break;
      default:
        dir = new Cesium.Cartesian3(0, -1, 0);
        up = new Cesium.Cartesian3(0, 0, 1);
    }

    if (centerPosition) {
      const carto = Cesium.Cartographic.fromCartesian(centerPosition);
      const cameraDistance = Math.max(500, carto.height + 300);
      const eye = Cesium.Cartesian3.add(
        centerPosition,
        Cesium.Cartesian3.multiplyByScalar(dir, cameraDistance),
        new Cesium.Cartesian3()
      );
      camera.setView({
        destination: eye,
        orientation: {
          direction: dir,
          up: up
        }
      });
    } else {
      const targetPoint = directionType === 'top'
        ? new Cesium.Cartesian3(0, 0, 0)
        : camera.position.clone();
      camera.lookAt(targetPoint, new Cesium.HeadingPitchRange(
        0, Cesium.Math.toRadians(-45), 0
      ));
      camera.setView({
        orientation: {
          direction: dir,
          up: up
        }
      });
    }
  }

  pickScreenPosition(windowX, windowY) {
    return this.viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(windowX, windowY),
      this.viewer.scene.globe.ellipsoid
    );
  }

  screenToCartesian(screenX, screenY) {
    const ray = this.viewer.camera.getPickRay(
      new Cesium.Cartesian2(screenX, screenY)
    );
    if (ray) {
      return this.viewer.scene.globe.pick(
        ray,
        this.viewer.scene.globe.ellipsoid
      );
    }
    return null;
  }

  getVisibleBounds() {
    const camera = this.viewer.camera;
    const rectangle = camera.computeViewRectangle();
    if (rectangle) {
      return {
        west: rectangle.west,
        east: rectangle.east,
        south: rectangle.south,
        north: rectangle.north
      };
    }
    return null;
  }

  getCameraFrustum() {
    return this.viewer.camera.frustum;
  }

  onTileCountChange(callback) {
    this._onTileCountChange = callback;
  }

  onFPSUpdate(callback) {
    this._onFPSUpdate = callback;
  }

  updateTileCount(count) {
    this._tileCount = count;
    if (this._onTileCountChange) {
      this._onTileCountChange(count);
    }
  }

  setCursor(cursor) {
    this.viewer.scene.canvas.style.cursor = cursor;
  }

  destroy() {
    if (this._fpsInterval) {
      clearInterval(this._fpsInterval);
      this._fpsInterval = null;
    }
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
}

export default Viewer;
