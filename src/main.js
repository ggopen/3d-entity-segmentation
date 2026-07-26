import './style.css';
import Viewer from './core/Viewer.js';
import TileLoader from './core/TileLoader.js';
import MultiViewRenderer from './core/MultiViewRenderer.js';
import SegmentEngine from './core/SegmentEngine.js';
import BackProjector from './core/BackProjector.js';
import SpatialCluster from './core/SpatialCluster.js';
import EntityVisualizer from './core/EntityVisualizer.js';
import InteractionController from './core/InteractionController.js';

const LOG_ENTRIES = [];
const MAX_LOG_ENTRIES = 200;

function addLog(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const entry = { time: timestamp, message, level };
  LOG_ENTRIES.push(entry);
  if (LOG_ENTRIES.length > MAX_LOG_ENTRIES) LOG_ENTRIES.shift();

  const logEl = document.getElementById('logContent');
  if (logEl) {
    const colors = { info: '#4fc3f7', success: '#81c784', warn: '#ffb74d', error: '#ef5350' };
    const color = colors[level] || '#ccc';
    const div = document.createElement('div');
    div.style.cssText = `color:${color};font-size:11px;line-height:1.5;padding:1px 0;word-break:break-all;`;
    div.textContent = `[${timestamp}] ${message}`;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    while (logEl.children.length > MAX_LOG_ENTRIES) {
      logEl.removeChild(logEl.firstChild);
    }
  }
  console.log(`[${level.toUpperCase()}] ${message}`);
}

function clearLog() {
  LOG_ENTRIES.length = 0;
  const logEl = document.getElementById('logContent');
  if (logEl) logEl.innerHTML = '';
}

function loadCesium() {
  return new Promise((resolve, reject) => {
    addLog('开始加载 Cesium 引擎...', 'info');

    if (window.Cesium) {
      addLog('Cesium 已存在，跳过加载', 'success');
      resolve();
      return;
    }

    window.CESIUM_BASE_URL = './cesium/';
    addLog(`CESIUM_BASE_URL 设置为: ${window.CESIUM_BASE_URL}`, 'info');

    const script = document.createElement('script');
    script.src = './cesium/Cesium.js';
    script.async = false;

    let resolved = false;
    const checkInterval = setInterval(() => {
      if (window.Cesium) {
        clearInterval(checkInterval);
        if (!resolved) {
          resolved = true;
          addLog(`Cesium 加载完成 (版本 ${window.Cesium.VERSION || window.CESIUM_VERSION || 'unknown'})`, 'success');
          resolve();
        }
      }
    }, 100);

    script.onload = async () => {
      addLog('Cesium.js 脚本加载完成，检查全局对象...', 'info');
      await new Promise(r => setTimeout(r, 100));

      if (window.Cesium) {
        clearInterval(checkInterval);
        if (!resolved) {
          resolved = true;
          addLog(`Cesium 初始化成功 (版本 ${window.Cesium.VERSION || window.CESIUM_VERSION || 'unknown'})`, 'success');
          resolve();
        }
        return;
      }

      addLog('Cesium.js 未自动设置 window.Cesium，使用包装加载...', 'warn');
      clearInterval(checkInterval);
      if (resolved) return;

      try {
        const response = await fetch('./cesium/Cesium.js');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const code = await response.text();

        const wrappedCode = `
          var __cesiumLoaded = (function() {
            ${code}
          });
          window.Cesium = __cesiumLoaded;
        `;

        const blob = new Blob([wrappedCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        const wrapperScript = document.createElement('script');
        wrapperScript.src = blobUrl;
        wrapperScript.onload = () => {
          URL.revokeObjectURL(blobUrl);
          if (window.Cesium) {
            resolved = true;
            addLog(`Cesium 包装加载成功 (版本 ${window.Cesium.VERSION || window.CESIUM_VERSION || 'unknown'})`, 'success');
            resolve();
          } else {
            resolved = true;
            addLog('Cesium 包装加载失败：返回值为空', 'error');
            reject(new Error('Cesium 加载失败：包装执行后返回值为空'));
          }
        };
        wrapperScript.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          if (!resolved) {
            resolved = true;
            addLog('Cesium 包装脚本执行失败', 'error');
            reject(new Error('Cesium 加载失败：包装脚本执行错误'));
          }
        };
        document.head.appendChild(wrapperScript);

      } catch (err) {
        if (!resolved) {
          resolved = true;
          addLog('Cesium 加载失败: ' + err.message, 'error');
          reject(new Error(`无法加载 Cesium.js: ${err.message}`));
        }
      }
    };

    script.onerror = (e) => {
      clearInterval(checkInterval);
      if (!resolved) {
        resolved = true;
        addLog(`Cesium.js 加载失败: ${script.src}`, 'error');
        reject(new Error(`无法加载 Cesium.js (${script.src})，请检查网络连接或文件路径`));
      }
    };

    setTimeout(() => {
      if (!resolved) {
        clearInterval(checkInterval);
        resolved = true;
        addLog('Cesium 加载超时 (>30s)', 'error');
        reject(new Error('Cesium 加载超时，请刷新页面重试'));
      }
    }, 30000);

    document.head.appendChild(script);
    addLog(`脚本已注入: ${script.src}`, 'info');
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
  addLog(text, 'info');
}

async function init() {
  addLog('系统初始化开始', 'info');
  addLog(`浏览器: ${navigator.userAgent.split(') ').pop()}`, 'info');

  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) { return false; }
  })();
  addLog(`WebGL 支持: ${hasWebGL ? '是' : '否'}`, hasWebGL ? 'success' : 'warn');

  showLoading('加载 Cesium 引擎...');
  setStatus('加载 Cesium 引擎...');

  try {
    await loadCesium();
  } catch (err) {
    hideLoading();
    setStatus('Cesium 加载失败: ' + err.message);
    addLog('Cesium 加载失败: ' + err.message, 'error');
    return;
  }

  showLoading('初始化三维引擎...');
  setStatus('初始化三维引擎...');

  try {
    addLog('创建 Viewer 实例...', 'info');
    state.viewer = new Viewer('cesiumContainer');
    addLog('Viewer 实例创建成功', 'success');

    addLog('初始化瓦片加载器...', 'info');
    state.tileLoader = new TileLoader(state.viewer);
    addLog('初始化多视角渲染器...', 'info');
    state.multiViewRenderer = new MultiViewRenderer(state.viewer);
    addLog('初始化分割引擎...', 'info');
    state.segmentEngine = new SegmentEngine();
    addLog('初始化三维反投影器...', 'info');
    state.backProjector = new BackProjector(state.viewer);
    addLog('初始化空间聚类器...', 'info');
    state.spatialCluster = new SpatialCluster();
    addLog('初始化实体可视化器...', 'info');
    state.entityVisualizer = new EntityVisualizer(state.viewer);
    addLog('初始化交互控制器...', 'info');
    state.interactionController = new InteractionController(state.viewer);
    addLog('所有模块初始化完成', 'success');

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
    addLog('系统就绪，可以开始使用', 'success');
  } catch (err) {
    hideLoading();
    addLog('初始化失败: ' + (err.message || String(err)), 'error');
    
    const msg = err.message || String(err);
    if (msg.includes('WebGL') || !hasWebGL) {
      setStatus('WebGL 不可用 - 请使用支持 WebGL 的浏览器');
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
  addLog('已显示 WebGL 不可用提示', 'warn');
}

function bindEvents() {
  $('loadTilesBtn').addEventListener('click', onLoadTiles);
  $('flyHomeBtn').addEventListener('click', () => {
    if (state.viewer) state.viewer.flyHome();
  });
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
      addLog('导出 GeoJSON 包围盒', 'success');
    }
  });
  $('exportJSON').addEventListener('click', () => {
    if (state.entities.length > 0) {
      state.entityVisualizer.exportSpatialJSON(state.entities);
      addLog('导出实体参数 JSON', 'success');
    }
  });

  $('clearLogBtn').addEventListener('click', () => {
    clearLog();
    addLog('日志已清空', 'info');
  });

  $('toggleLogBtn').addEventListener('click', () => {
    const panel = $('logPanel');
    panel.classList.toggle('collapsed');
    const icon = $('toggleLogBtn');
    if (panel.classList.contains('collapsed')) {
      icon.textContent = '▲';
    } else {
      icon.textContent = '▼';
    }
  });

  $('logPanelHeader').addEventListener('click', (e) => {
    if (e.target.id === 'clearLogBtn' || e.target.id === 'toggleLogBtn') return;
    const panel = $('logPanel');
    panel.classList.toggle('collapsed');
    const icon = $('toggleLogBtn');
    if (panel.classList.contains('collapsed')) {
      icon.textContent = '▲';
    } else {
      icon.textContent = '▼';
    }
  });

  addLog('事件绑定完成', 'info');
}

function setMode(mode) {
  state.extractMode = mode;
  $('modeViewportBtn').classList.toggle('active', mode === 'viewport');
  $('modeRectBtn').classList.toggle('active', mode === 'rect');
  state.interactionController.setRectMode(mode === 'rect');

  if (mode === 'rect') {
    setStatus('请在场景中框选区域...');
    addLog('切换到框选提取模式', 'info');
  } else {
    setStatus('就绪 - 点击"开始提取"进行全视口提取');
    addLog('切换到全视口提取模式', 'info');
  }
}

async function onLoadTiles() {
  const url = $('tilesetUrl').value.trim();
  if (!url) {
    addLog('瓦片 URL 为空', 'warn');
    return;
  }

  showLoading('加载瓦片数据...');
  setStatus('加载瓦片中...');
  addLog(`开始加载瓦片: ${url}`, 'info');

  try {
    const startTime = performance.now();
    await state.tileLoader.load(url);
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    setStatus('瓦片加载完成 - 可开始实体提取');
    $('extractBtn').disabled = false;
    addLog(`瓦片加载完成，耗时 ${elapsed}s`, 'success');
  } catch (err) {
    addLog('瓦片加载失败: ' + err.message, 'error');
    setStatus('瓦片加载失败: ' + err.message);
  } finally {
    hideLoading();
  }
}

async function onExtract() {
  if (state.extractMode === 'viewport') {
    showLoading('全视口实体提取中...');
    setStatus('全视口提取中...');
    addLog('开始全视口实体提取', 'info');
    await runExtraction(null);
    hideLoading();
  } else {
    setStatus('请在场景中框选区域...');
    addLog('等待用户框选区域...', 'info');
    state.interactionController.setRectMode(true);
  }
}

async function runExtraction(rect) {
  const startTime = performance.now();

  try {
    const viewTypes = state.config.views;
    addLog(`配置视角: ${viewTypes.join(', ')}`, 'info');

    setStatus('多视角渲染采样...');
    addLog('开始多视角渲染采样...', 'info');
    const viewports = viewTypes.map(v => {
      if (rect) {
        return state.multiViewRenderer.getViewWithRect(v, rect);
      }
      return state.multiViewRenderer.getView(v);
    });
    const renderResults = await state.multiViewRenderer.renderViews(viewports);
    addLog(`多视角渲染完成 (${renderResults.length} 个视角)`, 'success');

    setStatus('AI模型分割推理...');
    addLog('开始分割推理...', 'info');
    const masks = await state.segmentEngine.segmentMultiView(renderResults);
    addLog(`分割推理完成`, 'success');

    setStatus('掩码融合与三维反投影...');
    addLog('执行三维反投影...', 'info');
    const allTriangles = state.tileLoader.getVisibleTriangles();
    addLog(`可见三角面片数: ${allTriangles.length}`, 'info');
    const projectedTriangles = state.backProjector.projectTo3D(
      renderResults, masks, allTriangles
    );
    addLog(`反投影面片数: ${projectedTriangles.length}`, 'success');

    setStatus('空间连通聚类...');
    addLog('执行空间连通聚类...', 'info');
    const entities = state.spatialCluster.cluster(projectedTriangles, {
      connectThreshold: state.config.connectThreshold,
      minFaces: state.config.minFaces,
      filterGround: state.config.filterGround,
      groundThreshold: state.config.groundThreshold
    });
    addLog(`聚类完成: ${entities.length} 个实体`, 'success');

    setStatus('实体可视化...');
    addLog('渲染实体可视化...', 'info');
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
    addLog(`实体提取完成: ${entities.length} 个实体，耗时 ${elapsed}s`, 'success');

  } catch (err) {
    addLog('提取失败: ' + err.message, 'error');
    setStatus('提取失败: ' + err.message);
  }
}

function highlightEntity(idx) {
  if (idx < 0 || idx >= state.entities.length) return;
  state.entityVisualizer.highlightEntity(idx);
  state.viewer.flyToEntity(state.entities[idx]);
  addLog(`高亮实体 #${idx + 1}`, 'info');

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
  if (state.entityVisualizer) state.entityVisualizer.clear();
  if (state.segmentEngine) state.segmentEngine.clear();
  $('resultPanel').classList.add('hidden');
  $('entityCountStatus').textContent = '0';
  setStatus('已清除');
  addLog('结果已清除', 'info');
}

init();
