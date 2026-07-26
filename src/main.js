import './style.css';
import Viewer from './core/Viewer.js';
import TileLoader from './core/TileLoader.js';
import MultiViewRenderer from './core/MultiViewRenderer.js';
import SegmentEngine from './core/SegmentEngine.js';
import BackProjector from './core/BackProjector.js';
import SpatialCluster from './core/SpatialCluster.js';
import EntityVisualizer from './core/EntityVisualizer.js';
import InteractionController from './core/InteractionController.js';

function loadCesium() {
  return new Promise((resolve, reject) => {
    if (window.Cesium) {
      resolve();
      return;
    }
    window.CESIUM_BASE_URL = './cesium/';
    const script = document.createElement('script');
    script.src = './cesium/Cesium.js';
    script.onload = () => {
      if (window.Cesium) {
        resolve();
      } else {
        reject(new Error('Cesium failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Cesium script load failed'));
    document.head.appendChild(script);
  });
}

const state = {
  viewer: null,
  tileLoader: null,
  multiViewRenderer: null,
  segmentEngine: null,
  backProjector: null,
  spatialCluster: null,
  entityVisualizer: null,
  interactionController: null,
  entities: [],
  extractMode: 'viewport',
  config: {
    views: ['top', 'angle', 'front'],
    connectThreshold: 0.5,
    minFaces: 20,
    filterGround: true,
    groundThreshold: 0.1
  }
};

const $ = (id) => document.getElementById(id);

function showLoading(text) {
  const overlay = $('loadingOverlay');
  overlay.style.display = 'block';
  $('loadingText').textContent = text || '处理中...';
}

function hideLoading() {
  $('loadingOverlay').style.display = 'none';
}

function setStatus(text) {
  $('statusText').textContent = text;
}

async function init() {
  showLoading('加载 Cesium 引擎...');
  setStatus('加载 Cesium 引擎...');

  try {
    await loadCesium();
    console.log('Cesium loaded:', typeof Cesium);
  } catch (err) {
    console.error('Cesium load failed:', err);
    hideLoading();
    setStatus('Cesium 加载失败: ' + err.message);
    return;
  }

  showLoading('初始化三维引擎...');
  setStatus('初始化中...');

  try {
    state.viewer = new Viewer('cesiumContainer');
    state.tileLoader = new TileLoader(state.viewer);
    state.multiViewRenderer = new MultiViewRenderer(state.viewer);
    state.segmentEngine = new SegmentEngine();
    state.backProjector = new BackProjector(state.viewer);
    state.spatialCluster = new SpatialCluster();
    state.entityVisualizer = new EntityVisualizer(state.viewer);
    state.interactionController = new InteractionController(state.viewer);

    state.viewer.onTileCountChange((c) => $('tileCount').textContent = c);
    state.viewer.onFPSUpdate((f) => $('fpsCounter').textContent = f.toFixed(0));

    state.interactionController.onRectSelect(async (rect) => {
      showLoading('框选区域提取中...');
      setStatus('框选提取中...');
      await runExtraction(rect);
      hideLoading();
    });

    state.interactionController.onEntityClick((picked) => {
      const idx = state.entityVisualizer._entityPrimitives.indexOf(picked.primitive);
      if (idx >= 0) {
        const entityIdx = Math.floor(idx / 2);
        highlightEntity(entityIdx);
      }
    });

    hideLoading();
    setStatus('就绪 - 请加载瓦片数据');

    bindEvents();
    setMode('viewport');
  } catch (err) {
    console.error('初始化失败:', err);
    hideLoading();
    
    const msg = err.message || String(err);
    if (msg.includes('WebGL')) {
      setStatus('WebGL 不可用 - 请使用支持 WebGL 的浏览器（Chrome/Firefox/Edge 最新版）');
      showWebGLFallback(msg);
    } else {
      setStatus('初始化失败: ' + msg);
    }
  }
}

function showWebGLFallback(message) {
  const container = $('cesiumContainer');
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;text-align:center;padding:20px;">
      <div>
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h2 style="margin-bottom:12px;color:#ff6b6b;">WebGL 不可用</h2>
        <p style="margin-bottom:8px;line-height:1.6;">${message}</p>
        <p style="color:#888;font-size:14px;margin-top:16px;">
          推荐浏览器：Chrome 90+ / Firefox 88+ / Edge 90+<br>
          请确保显卡驱动已更新，并在浏览器设置中启用硬件加速
        </p>
      </div>
    </div>
  `;
  container.style.background = '#1a1a2e';
}

function bindEvents() {
  $('loadTilesBtn').addEventListener('click', onLoadTiles);
  $('flyHomeBtn').addEventListener('click', () => state.viewer.flyHome());
  $('extractBtn').addEventListener('click', onExtract);
  $('clearBtn').addEventListener('click', onClear);
  $('modeViewportBtn').addEventListener('click', () => setMode('viewport'));
  $('modeRectBtn').addEventListener('click', () => setMode('rect'));

  document.querySelectorAll('.view-badge').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (state.config.views.includes(view)) {
        state.config.views = state.config.views.filter(v => v !== view);
        el.classList.remove('active');
      } else {
        state.config.views.push(view);
        el.classList.add('active');
      }
    });
  });

  $('threshold').addEventListener('input', (e) => {
    state.config.connectThreshold = parseFloat(e.target.value);
    $('thresholdVal').textContent = e.target.value;
  });
  $('minFaces').addEventListener('input', (e) => {
    state.config.minFaces = parseInt(e.target.value);
    $('minFacesVal').textContent = e.target.value;
  });
  $('filterGround').addEventListener('change', (e) => {
    state.config.filterGround = e.target.checked;
  });

  $('exportGeoJSON').addEventListener('click', () => {
    if (state.entities.length > 0) {
      state.entityVisualizer.exportGeoJSON(state.entities);
    }
  });
  $('exportJSON').addEventListener('click', () => {
    if (state.entities.length > 0) {
      state.entityVisualizer.exportSpatialJSON(state.entities);
    }
  });
}

function setMode(mode) {
  state.extractMode = mode;
  $('modeViewportBtn').classList.toggle('active', mode === 'viewport');
  $('modeRectBtn').classList.toggle('active', mode === 'rect');
  state.interactionController.setRectMode(mode === 'rect');

  if (mode === 'rect') {
    setStatus('请在场景中框选区域...');
  } else {
    setStatus('就绪 - 点击"开始提取"进行全视口提取');
  }
}

async function onLoadTiles() {
  const url = $('tilesetUrl').value.trim();
  if (!url) return;

  showLoading('加载瓦片数据...');
  setStatus('加载瓦片中...');

  try {
    await state.tileLoader.load(url);
    setStatus('瓦片加载完成 - 可开始实体提取');
    $('extractBtn').disabled = false;
  } catch (err) {
    console.error('瓦片加载失败:', err);
    setStatus('瓦片加载失败: ' + err.message);
  } finally {
    hideLoading();
  }
}

async function onExtract() {
  if (state.extractMode === 'viewport') {
    showLoading('全视口实体提取中...');
    setStatus('全视口提取中...');
    await runExtraction(null);
    hideLoading();
  } else {
    setStatus('请在场景中框选区域...');
    state.interactionController.setRectMode(true);
  }
}

async function runExtraction(rect) {
  const startTime = performance.now();

  try {
    const viewTypes = state.config.views;
    const viewports = viewTypes.map(v => {
      if (rect) {
        return state.multiViewRenderer.getViewWithRect(v, rect);
      }
      return state.multiViewRenderer.getView(v);
    });

    setStatus('多视角渲染采样...');
    const renderResults = await state.multiViewRenderer.renderViews(viewports);

    setStatus('AI模型分割推理...');
    const masks = await state.segmentEngine.segmentMultiView(renderResults);

    setStatus('掩码融合与三维反投影...');
    const allTriangles = state.tileLoader.getVisibleTriangles();
    const projectedTriangles = state.backProjector.projectTo3D(
      renderResults, masks, allTriangles
    );

    setStatus('空间连通聚类...');
    const entities = state.spatialCluster.cluster(projectedTriangles, {
      connectThreshold: state.config.connectThreshold,
      minFaces: state.config.minFaces,
      filterGround: state.config.filterGround,
      groundThreshold: state.config.groundThreshold
    });

    setStatus('实体可视化...');
    state.entityVisualizer.visualize(entities);
    state.interactionController.onEntityClick((picked) => {
      const idx = state.entityVisualizer._entityPrimitives.indexOf(picked.primitive);
      if (idx >= 0) {
        const entityIdx = Math.floor(idx / 2);
        highlightEntity(entityIdx);
      }
    });

    state.entities = entities;
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    updateResultsPanel(entities, elapsed);
    $('entityCountStatus').textContent = entities.length;
    setStatus(`提取完成 - ${entities.length} 个实体, 耗时 ${elapsed}s`);
    $('resultPanel').classList.remove('hidden');

  } catch (err) {
    console.error('提取失败:', err);
    setStatus('提取失败: ' + err.message);
  }
}

function highlightEntity(idx) {
  if (idx < 0 || idx >= state.entities.length) return;
  state.entityVisualizer.highlightEntity(idx);
  state.viewer.flyToEntity(state.entities[idx]);

  document.querySelectorAll('.entity-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.entityId) === idx);
  });
}

function updateResultsPanel(entities, elapsed) {
  $('entityCount').textContent = entities.length;
  $('processTime').textContent = elapsed + 's';

  const listEl = $('entityList');
  listEl.innerHTML = '';

  entities.forEach((entity, idx) => {
    const div = document.createElement('div');
    div.className = 'entity-item';
    div.dataset.entityId = idx;

    const center = entity.boundingBox.center;
    const area = entity.area.toFixed(1);
    const faces = entity.faces.length;

    div.innerHTML = `
      <div class="entity-id">实体 #${idx + 1}</div>
      <div class="entity-info">面片: ${faces} | 面积: ${area}m²</div>
      <div class="entity-info">中心: (${center[0].toFixed(4)}, ${center[1].toFixed(4)}, ${center[2].toFixed(4)})</div>
    `;

    div.addEventListener('click', () => highlightEntity(idx));
    listEl.appendChild(div);
  });
}

function onClear() {
  state.entities = [];
  state.entityVisualizer.clear();
  state.segmentEngine.clear();
  $('resultPanel').classList.add('hidden');
  $('entityCountStatus').textContent = '0';
  setStatus('已清除');
}

init();
