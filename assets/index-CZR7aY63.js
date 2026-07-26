(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function t(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=t(n);fetch(n.href,s)}})();class me{constructor(e){this.containerId=e,this._tileCount=0,this._fpsFrames=0,this._fpsLastTime=performance.now(),this._fpsInterval=null,this._onTileCountChange=null,this._onFPSUpdate=null,this._checkWebGL(),this._initViewer(),this._setupFPSCounter()}_checkWebGL(){const e=document.createElement("canvas");if(!(e.getContext("webgl")||e.getContext("experimental-webgl")))throw new Error("您的浏览器或硬件不支持 WebGL，无法运行三维引擎。请使用最新版 Chrome、Firefox 或 Edge 浏览器，并确保显卡驱动已更新。")}_initViewer(){Cesium.Ion.defaultAccessToken="",this.viewer=new Cesium.Viewer(this.containerId,{animation:!1,timeline:!1,baseLayerPicker:!1,geocoder:!1,homeButton:!1,sceneModePicker:!1,navigationHelpButton:!1,fullscreenButton:!1,infoBox:!1,selectionIndicator:!1,shouldAnimate:!0,imageryProvider:new Cesium.UrlTemplateImageryProvider({url:"https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",subdomains:["1","2","3","4"],maximumLevel:18,credit:""}),terrain:void 0}),this.viewer.scene.globe.enableLighting=!1,this.viewer.scene.skyAtmosphere.show=!1,this.viewer.scene.fog.enabled=!1,this.viewer.scene.backgroundColor=Cesium.Color.fromCssColorString("#0a0e14"),this.viewer.scene.globe.showGroundAtmosphere=!1,this.viewer.scene.synchronicBlockedFrames=0,this.viewer.clock.shouldAnimate=!0,this.viewer.scene.postProcessStages.fxaa.enabled=!0;const e=this.viewer.scene.canvas;e.style.pointerEvents="auto",e.style.cursor="grab",this._originalCursor=e.style.cursor,this.viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(116.391,39.907,500)}),this._setupInputHandlers()}_setupInputHandlers(){const e=this.viewer.screenSpaceEventHandler,t=[Cesium.ScreenSpaceEventType.LEFT_DOWN,Cesium.ScreenSpaceEventType.LEFT_UP,Cesium.ScreenSpaceEventType.RIGHT_DOWN,Cesium.ScreenSpaceEventType.RIGHT_UP,Cesium.ScreenSpaceEventType.MIDDLE_DOWN,Cesium.ScreenSpaceEventType.MIDDLE_UP,Cesium.ScreenSpaceEventType.MOUSE_MOVE,Cesium.ScreenSpaceEventType.WHEEL,Cesium.ScreenSpaceEventType.PINCH_START,Cesium.ScreenSpaceEventType.PINCH_MOVE,Cesium.ScreenSpaceEventType.PINCH_END];for(const i of t)e.removeInputAction(i)}_setupFPSCounter(){this._fpsInterval=setInterval(()=>{const e=performance.now(),t=e-this._fpsLastTime,i=this._fpsFrames/t*1e3;this._fpsFrames=0,this._fpsLastTime=e,this._onFPSUpdate&&this._onFPSUpdate(i)},1e3),this.viewer.scene.postRender.addEventListener(()=>{this._fpsFrames++})}getCanvas(){return this.viewer.scene.canvas}getWidth(){return this.viewer.scene.canvas.width}getHeight(){return this.viewer.scene.canvas.height}getScene(){return this.viewer.scene}getCameraMatrix(){const e=this.viewer.camera;return{view:e.viewMatrix.clone(),projection:e.frustum.projectionMatrix.clone(),inverseView:e.inverseViewMatrix.clone(),position:e.position.clone(),direction:e.direction.clone(),up:e.up.clone(),right:e.right.clone()}}screenshot(){const e=this.viewer.scene.canvas,t=document.createElement("canvas");return t.width=e.width,t.height=e.height,t.getContext("2d").drawImage(e,0,0),t}flyHome(){this.viewer.camera.flyHome(1.5)}flyToEntity(e){if(!e||!e.boundingBox)return;const t=e.boundingBox.center,i=e.boundingBox;Cesium.Cartesian3.fromDegrees(t[0],t[1],t[2]);const s=Math.max(i.max[0]-i.min[0],i.max[1]-i.min[1],i.max[2]-i.min[2])*3;this.viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(t[0],t[1]-.001,t[2]+s),duration:1.5})}setViewByDirection(e,t){const i=this.viewer.camera;let n,s;switch(e){case"top":n=new Cesium.Cartesian3(0,0,-1),s=new Cesium.Cartesian3(0,1,0);break;case"angle":n=new Cesium.Cartesian3(-1,-1,-1),s=new Cesium.Cartesian3(0,0,1);break;case"front":n=new Cesium.Cartesian3(0,-1,0),s=new Cesium.Cartesian3(0,0,1);break;default:n=new Cesium.Cartesian3(0,-1,0),s=new Cesium.Cartesian3(0,0,1)}if(t){const r=Cesium.Cartographic.fromCartesian(t),o=Math.max(500,r.height+300),h=Cesium.Cartesian3.add(t,Cesium.Cartesian3.multiplyByScalar(n,o),new Cesium.Cartesian3);i.setView({destination:h,orientation:{direction:n,up:s}})}else{const r=e==="top"?new Cesium.Cartesian3(0,0,0):i.position.clone();i.lookAt(r,new Cesium.HeadingPitchRange(0,Cesium.Math.toRadians(-45),0)),i.setView({orientation:{direction:n,up:s}})}}pickScreenPosition(e,t){return this.viewer.camera.pickEllipsoid(new Cesium.Cartesian2(e,t),this.viewer.scene.globe.ellipsoid)}screenToCartesian(e,t){const i=this.viewer.camera.getPickRay(new Cesium.Cartesian2(e,t));return i?this.viewer.scene.globe.pick(i,this.viewer.scene.globe.ellipsoid):null}getVisibleBounds(){const t=this.viewer.camera.computeViewRectangle();return t?{west:t.west,east:t.east,south:t.south,north:t.north}:null}getCameraFrustum(){return this.viewer.camera.frustum}onTileCountChange(e){this._onTileCountChange=e}onFPSUpdate(e){this._onFPSUpdate=e}updateTileCount(e){this._tileCount=e,this._onTileCountChange&&this._onTileCountChange(e)}setCursor(e){this.viewer.scene.canvas.style.cursor=e}destroy(){this._fpsInterval&&(clearInterval(this._fpsInterval),this._fpsInterval=null),this.viewer&&(this.viewer.destroy(),this.viewer=null)}}class ge{constructor(e){this.viewer=e,this.tileset=null,this._currentTriangles=[],this._tileLoadProgress=0,this._onTilesReady=null}async load(e){var t;this.clear(),L("正在获取瓦片配置..."),fe("加载瓦片数据...");try{const i=await fetch(e);if(!i.ok)throw new Error("HTTP "+i.status+" "+i.statusText);const n=await i.json();return console.log("Tileset JSON loaded:",(t=n.asset)==null?void 0:t.version,"root:",!!n.root),L("正在初始化三维瓦片..."),new Promise((s,r)=>{try{const o=new Cesium.Cesium3DTileset({url:e,maximumScreenSpaceError:16,skipLevelOfDetail:!0,baseScreenSpaceError:1024});if(this.tileset=o,o.initialTilesLoaded.addEventListener(()=>{L("瓦片基础层级加载完成"),Q()}),o.allTilesLoaded.addEventListener(()=>{console.log("All tiles loaded"),L("所有瓦片加载完成")}),o.tileFailed.addEventListener(a=>{console.warn("Tile failed:",a)}),this.viewer.viewer.scene.primitives.add(o),o.boundingSphere){const a=Math.max(o.boundingSphere.radius,100);this.viewer.viewer.camera.flyToBoundingSphere(o.boundingSphere,{duration:2,offset:new Cesium.HeadingPitchRange(0,Cesium.Math.toRadians(-30),a*2)})}let h=0;const l=()=>{if(this.tileset&&!this.tileset.isDestroyed()){h++;const a=this._countTiles(this.tileset);this.viewer.updateTileCount(a),h%30===0&&this._extractTriangleData(this.tileset)}requestAnimationFrame(l)};l(),setTimeout(()=>{this._extractTriangleData(this.tileset),s(o)},5e3),setTimeout(()=>{s(o)},15e3)}catch(o){r(o)}})}catch(i){throw console.error("Tile load failed:",i),Q(),L("瓦片加载失败: "+i.message),i}}_countTiles(e){let t=0;const i=n=>{if(n&&(t++,n._children))for(const s of n._children)s&&i(s)};return e._root&&i(e._root),t}_extractTriangleData(e){if(!e._root||this._extracting)return;this._extracting=!0;const t=[],i=n=>{if(!(!n||!n.content)){try{const s=n.content._content||n.content;if(!s)return;const r=s._primitive||s;if(!r||!r.geometry)return;const o=r.geometry.getAttribute("position"),h=r.geometry.getIndex();if(!o||!h)return;const l=o.array,a=h.array,d=n._boundingVolumeCenter?Cesium.Matrix4.fromTranslation(n._boundingVolumeCenter):null;for(let m=0;m<a.length;m+=3){const f=a[m]*3,C=a[m+1]*3,w=a[m+2]*3;if(f+2>=l.length)continue;const y=new Cesium.Cartesian3(l[f],l[f+1],l[f+2]),_=new Cesium.Cartesian3(l[C],l[C+1],l[C+2]),T=new Cesium.Cartesian3(l[w],l[w+1],l[w+2]),x=d?Cesium.Matrix4.multiplyByPoint(d,y,new Cesium.Cartesian3):y,M=d?Cesium.Matrix4.multiplyByPoint(d,_,new Cesium.Cartesian3):_,S=d?Cesium.Matrix4.multiplyByPoint(d,T,new Cesium.Cartesian3):T;t.push({vertices:[x,M,S],tileId:n._id||"unknown",center:new Cesium.Cartesian3((x.x+M.x+S.x)/3,(x.y+M.y+S.y)/3,(x.z+M.z+S.z)/3)})}}catch{}if(n._children)for(const s of n._children)s&&i(s)}};i(e._root),this._currentTriangles=t,this._extracting=!1}getCurrentTiles(){return this._currentTriangles||[]}getVisibleTriangles(){return this._currentTriangles||[]}clear(){this.tileset&&(this.viewer.viewer.scene.primitives.remove(this.tileset),this.tileset=null),this._currentTriangles=[]}isLoaded(){return this.tileset!==null}getBoundingSphere(){return this.tileset&&this.tileset.boundingSphere?this.tileset.boundingSphere:null}}function L(c){const e=document.getElementById("statusText");e&&(e.textContent=c)}function fe(c){const e=document.getElementById("loadingOverlay"),t=document.getElementById("loadingText");e&&t&&(e.style.display="block",t.textContent=c)}function Q(){const c=document.getElementById("loadingOverlay");c&&(c.style.display="none")}class pe{constructor(e){this.viewer=e,this._originalCameraState=null}getView(e){const t={top:{label:"俯视",dir:"top"},angle:{label:"斜45°",dir:"angle"},front:{label:"平视",dir:"front"}};return t[e]||t.angle}getViewWithRect(e,t){return{...this.getView(e),rect:t}}async renderViews(e){this._saveOriginalCamera();const t=[];for(const i of e)try{const n=await this._renderSingleView(i);t.push(n)}catch(n){console.error("Failed to render view:",i.dir,n);const s=this.viewer.getCanvas();t.push({viewType:i.label,viewDir:i.dir,image:this._createBlankCanvas(s.width,s.height),depthMap:null,pixelMapping:new Int32Array(s.width*s.height).fill(-1),cameraMatrix:this.viewer.getCameraMatrix(),width:s.width,height:s.height,rect:i.rect||null})}return this._restoreOriginalCamera(),t}_saveOriginalCamera(){const e=this.viewer.viewer.camera;this._originalCameraState={position:e.position.clone(),direction:e.direction.clone(),up:e.up.clone(),right:e.right.clone()}}_restoreOriginalCamera(){this._originalCameraState&&(this.viewer.viewer.camera.setView({destination:this._originalCameraState.position,orientation:{direction:this._originalCameraState.direction,up:this._originalCameraState.up}}),this._originalCameraState=null)}async _renderSingleView(e){const t=this.viewer.getCanvas(),i=t.width,n=t.height,s=this.viewer.viewer.camera;this._setCameraForView(s,e),await this._waitForRender(5);const r=this.viewer.screenshot(),o=this._captureDepthMap(),h=this._buildPixelTriangleMapping(s,i,n),l=this.viewer.getCameraMatrix();return{viewType:e.label,viewDir:e.dir,image:r,depthMap:o,pixelMapping:h,cameraMatrix:l,width:i,height:n,rect:e.rect||null}}_setCameraForView(e,t){const i=this._getSceneCenter(),n=Cesium.Cartesian3.fromDegrees(i.lon,i.lat,i.height);switch(t.dir){case"top":{e.setView({destination:Cesium.Cartesian3.fromDegrees(i.lon,i.lat,500),orientation:{direction:new Cesium.Cartesian3(0,0,-1),up:new Cesium.Cartesian3(0,1,0)}});break}case"angle":{const r=Cesium.Cartesian3.fromDegrees(i.lon-.003,i.lat-.003,i.height+600),o=Cesium.Cartesian3.subtract(n,r,new Cesium.Cartesian3);Cesium.Cartesian3.normalize(o,o),e.setView({destination:r,orientation:{direction:o,up:new Cesium.Cartesian3(0,0,1)}});break}case"front":{const s=Cesium.Cartesian3.fromDegrees(i.lon,i.lat-.005,i.height+100),r=Cesium.Cartesian3.subtract(n,s,new Cesium.Cartesian3);Cesium.Cartesian3.normalize(r,r),e.setView({destination:s,orientation:{direction:r,up:new Cesium.Cartesian3(0,0,1)}});break}}}_getSceneCenter(){const t=this.viewer.getScene().primitives;for(let s=0;s<t.length;s++){const r=t.get(s);if(r&&r.boundingSphere){const o=r.boundingSphere.center,h=Cesium.Cartographic.fromCartesian(o);return{lon:Cesium.Math.toDegrees(h.longitude),lat:Cesium.Math.toDegrees(h.latitude),height:h.height}}}const i=this.viewer.viewer.camera,n=Cesium.Cartographic.fromCartesian(i.position);return{lon:Cesium.Math.toDegrees(n.longitude),lat:Cesium.Math.toDegrees(n.latitude),height:n.height}}_waitForRender(e){return new Promise(t=>{let i=0;const n=()=>{i++,i>=e?t():requestAnimationFrame(n)};requestAnimationFrame(n)})}_captureDepthMap(){const e=this.viewer.getScene(),t=e.depthTexture;if(!t)return null;try{const n=e.context.gl,s=t.width,r=t.height,o=n.createFramebuffer();n.bindFramebuffer(n.FRAMEBUFFER,o),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,t,0);const h=new Float32Array(s*r*4);n.readPixels(0,0,s,r,n.RGBA,n.FLOAT,h),n.bindFramebuffer(n.FRAMEBUFFER,null),n.deleteFramebuffer(o);const l=new Float32Array(s*r);for(let a=0;a<s*r;a++)l[a]=h[a*4];return{data:l,width:s,height:r}}catch{return null}}_buildPixelTriangleMapping(e,t,i){const n=new Int32Array(t*i).fill(-1),r=this.viewer.getScene().primitives;let o=null;for(let y=0;y<r.length;y++){const _=r.get(y);if(_&&_._root){o=_;break}}if(!o||!o._root)return n;const h=e.frustum,l=e.direction,a=e.right,d=e.up,m=e.position,f=h.fov,C=t/i,w=(y,_)=>{if(!y||!y.content)return 0;let T=0;try{const x=y.content._content||y.content;if(!x)return 0;const M=x._primitive||x;if(!M||!M.geometry)return 0;const S=M.geometry.getAttribute("position"),q=M.geometry.getIndex();if(!S||!q)return 0;const b=S.array,B=q.array,E=y._boundingVolumeCenter?Cesium.Matrix4.fromTranslation(y._boundingVolumeCenter):null;for(let k=0;k<B.length;k+=3){const I=B[k]*3,R=B[k+1]*3,F=B[k+2]*3;if(I+2>=b.length||R+2>=b.length||F+2>=b.length)continue;const X=new Cesium.Cartesian3(b[I],b[I+1],b[I+2]),Y=new Cesium.Cartesian3(b[R],b[R+1],b[R+2]),Z=new Cesium.Cartesian3(b[F],b[F+1],b[F+2]),z=E?Cesium.Matrix4.multiplyByPoint(E,X,new Cesium.Cartesian3):X,D=E?Cesium.Matrix4.multiplyByPoint(E,Y,new Cesium.Cartesian3):Y,V=E?Cesium.Matrix4.multiplyByPoint(E,Z,new Cesium.Cartesian3):Z,te=Cesium.Cartesian3.subtract(z,m,new Cesium.Cartesian3),ie=Cesium.Cartesian3.subtract(D,m,new Cesium.Cartesian3),ne=Cesium.Cartesian3.subtract(V,m,new Cesium.Cartesian3),H=Cesium.Cartesian3.dot(te,l),O=Cesium.Cartesian3.dot(ie,l),G=Cesium.Cartesian3.dot(ne,l);if(H<0&&O<0&&G<0)continue;const se=Math.max(H,O,G),re=Math.min(H,O,G);if(se<0||re>1e4)continue;const oe=new Cesium.Cartesian3((z.x+D.x+V.x)/3,(z.y+D.y+V.y)/3,(z.z+D.z+V.z)/3),U=Cesium.Cartesian3.subtract(oe,m,new Cesium.Cartesian3),$=Cesium.Cartesian3.dot(U,l);if($<=0)continue;const ae=Cesium.Cartesian3.dot(U,a),ce=Cesium.Cartesian3.dot(U,d),K=Math.tan(f/2),le=K*C,he=(ae/($*le)+1)/2,ue=1-(ce/($*K)+1)/2,N=Math.floor(he*t),j=Math.floor(ue*i);if(N>=0&&N<t&&j>=0&&j<i){const de=j*t+N;n[de]=_+T}T++}}catch{}if(y._children&&y._children.length>0)for(const x of y._children)x&&(T+=w(x,_+T));return T};return o._root&&w(o._root,0),n}_createBlankCanvas(e,t){const i=document.createElement("canvas");i.width=e,i.height=t;const n=i.getContext("2d");return n.fillStyle="#0a0e14",n.fillRect(0,0,e,t),i}}class Ce{constructor(){this._worker=null,this._ready=!1,this._init()}_init(){const e=this._getWorkerCode(),t=new Blob([e],{type:"application/javascript"}),i=URL.createObjectURL(t);this._worker=new Worker(i),this._workerUrl=i}_getWorkerCode(){return`
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
    `}async init(){return new Promise(e=>{if(this._ready){e(!0);return}const t=i=>{const n=i.data;n.type==="ready"?(this._ready=n.data.success,this._worker.removeEventListener("message",t),e(n.data.success)):n.type==="error"&&(this._worker.removeEventListener("message",t),e(!1))};this._worker.addEventListener("message",t),this._worker.postMessage({type:"init"})})}async segmentMultiView(e){this._ready||await this.init();const t=[];for(const i of e){const n=await this._segmentSingleView(i);t.push({viewType:i.viewType,viewDir:i.viewDir,mask:n.data,width:n.width,height:n.height,pixelMapping:i.pixelMapping,cameraMatrix:i.cameraMatrix,rect:i.rect})}return t}async _segmentSingleView(e){const{image:t,width:i,height:n,viewType:s,rect:r}=e;let o=i,h=n,l;if(r){const a=Math.max(0,Math.floor(r.x)),d=Math.max(0,Math.floor(r.y)),m=Math.min(i-a,Math.floor(r.width)),f=Math.min(n-d,Math.floor(r.height)),C=document.createElement("canvas");C.width=m,C.height=f;const w=C.getContext("2d");w.drawImage(t,a,d,m,f,0,0,m,f),l=w.getImageData(0,0,m,f),o=m,h=f}else{const a=document.createElement("canvas");a.width=i,a.height=n;const d=a.getContext("2d");d.drawImage(t,0,0),l=d.getImageData(0,0,i,n)}return new Promise(a=>{const d=m=>{const f=m.data;f.type==="result"?(this._worker.removeEventListener("message",d),a({data:f.data.mask,width:f.data.width,height:f.data.height})):f.type==="error"&&(this._worker.removeEventListener("message",d),a({data:new Uint8Array(o*h),width:o,height:h}))};this._worker.addEventListener("message",d),this._worker.postMessage({type:"segment",imageData:{width:l.width,height:l.height,data:l.data},viewType:s})})}clear(){}destroy(){this._worker&&(this._worker.terminate(),this._worker=null),this._workerUrl&&(URL.revokeObjectURL(this._workerUrl),this._workerUrl=null),this._ready=!1}}class we{constructor(e){this.viewer=e,this._pixelTriangleMap=null}projectTo3D(e,t,i){const n=new Map;for(let s=0;s<t.length;s++){const r=t[s],o=e[s],h=this._projectViewMask(r,o,i);this._mergeTriangleSets(n,h)}return Array.from(n.values())}_projectViewMask(e,t,i){const{mask:n,width:s,height:r,pixelMapping:o,cameraMatrix:h}=e,l=new Map,a=e.width,d=e.height;for(let m=0;m<d;m++)for(let f=0;f<a;f++)if(n[m*a+f]===1){let C=f,w=m;(a!==s||d!==r)&&(C=Math.floor(f*s/a),w=Math.floor(m*r/d));const y=w*s+C,_=o[y];_>=0&&_<i.length&&l.set(_,i[_])}return l}_mergeTriangleSets(e,t){for(const[i,n]of t)e.has(i)||e.set(i,n)}fuseMultiViewMasks(e){if(!e||e.length===0)return null;if(e.length===1)return e[0];const t=e[0],i=new Uint8Array(t.width*t.height);for(const n of e)if(n.width===t.width&&n.height===t.height)for(let s=0;s<i.length;s++)n.mask[s]===1&&(i[s]=1);else{const s=t.width/n.width,r=t.height/n.height;for(let o=0;o<n.height;o++)for(let h=0;h<n.width;h++)if(n.mask[o*n.width+h]===1){const l=Math.floor(h*s),a=Math.floor(o*r);l>=0&&l<t.width&&a>=0&&a<t.height&&(i[a*t.width+l]=1)}}return{data:i,width:t.width,height:t.height}}pixelsToWorld(e,t){const{view:i,projection:n,position:s,direction:r,up:o,right:h}=t,l=[];for(const a of e){const d=a.depth||100,m=a.x/a.width*2-1,f=1-a.y/a.height*2,C=new Cesium.Cartesian4(m,f,-1,1),w=Cesium.Matrix4.multiplyByPoint(Cesium.Matrix4.inverse(n,new Cesium.Matrix4),C,new Cesium.Cartesian4);w.x/=w.w,w.y/=w.w,w.z/=w.w;const y=new Cesium.Cartesian3(s.x+r.x*d+h.x*w.x+o.x*w.y,s.y+r.y*d+h.y*w.x+o.y*w.y,s.z+r.z*d+h.z*w.x+o.z*w.y);l.push(y)}return l}computeTriangleCenters(e){return e.map(t=>{const i=t.vertices[0],n=t.vertices[1],s=t.vertices[2];return new Cesium.Cartesian3((i.x+n.x+s.x)/3,(i.y+n.y+s.y)/3,(i.z+n.z+s.z)/3)})}}class ye{constructor(){this._connectedThreshold=.5,this._minFaces=20,this._filterGround=!0,this._groundThreshold=.1}cluster(e,t){if(this._connectedThreshold=t.connectThreshold||.5,this._minFaces=t.minFaces||20,this._filterGround=t.filterGround!==void 0?t.filterGround:!0,this._groundThreshold=t.groundThreshold||.1,!e||e.length===0)return[];const i=this._preprocess(e),n=this._filterGroundTriangles(i),s=this._connectedComponentAnalysis(n);return this._buildEntities(s)}_preprocess(e){return e.map((t,i)=>{const n=t.vertices,s=n[0],r=n[1],o=n[2],h=new Cesium.Cartesian3((s.x+r.x+o.x)/3,(s.y+r.y+o.y)/3,(s.z+r.z+o.z)/3),l=[{v0:0,v1:1,length:Cesium.Cartesian3.distance(s,r)},{v0:1,v1:2,length:Cesium.Cartesian3.distance(r,o)},{v0:2,v1:0,length:Cesium.Cartesian3.distance(o,s)}],a=Math.max(l[0].length,l[1].length,l[2].length),d=this._computeNormal(s,r,o);return{id:i,vertices:[s,r,o],center:h,normal:d,maxEdge:a,area:this._computeArea(s,r,o),tileId:t.tileId||"unknown"}})}_computeNormal(e,t,i){const n=Cesium.Cartesian3.subtract(t,e,new Cesium.Cartesian3),s=Cesium.Cartesian3.subtract(i,e,new Cesium.Cartesian3),r=Cesium.Cartesian3.cross(n,s,new Cesium.Cartesian3),o=Cesium.Cartesian3.magnitude(r);return o>0?Cesium.Cartesian3.divideByScalar(r,o,new Cesium.Cartesian3):new Cesium.Cartesian3(0,0,1)}_computeArea(e,t,i){const n=Cesium.Cartesian3.subtract(t,e,new Cesium.Cartesian3),s=Cesium.Cartesian3.subtract(i,e,new Cesium.Cartesian3),r=Cesium.Cartesian3.cross(n,s,new Cesium.Cartesian3);return Cesium.Cartesian3.magnitude(r)/2}_filterGroundTriangles(e){if(!this._filterGround)return e;const t=new Map;for(const n of e)t.has(n.tileId)||t.set(n.tileId,[]),t.get(n.tileId).push(n);const i=new Set;for(const[n,s]of t){if(s.length<3)continue;let r=0;for(const h of s)r+=h.center.z;r/=s.length;let o=0;for(const h of s)o+=(h.center.z-r)**2;o=Math.sqrt(o/s.length),o<this._groundThreshold*10&&s.length>50&&i.add(n)}return e.filter(n=>!i.has(n.tileId))}_connectedComponentAnalysis(e){if(e.length===0)return[];const t=e.length,i=new Int32Array(t),n=new Int32Array(t);for(let a=0;a<t;a++)i[a]=a;const s=a=>(i[a]!==a&&(i[a]=s(i[a])),i[a]),r=(a,d)=>{const m=s(a),f=s(d);m!==f&&(n[m]<n[f]?i[m]=f:n[m]>n[f]?i[f]=m:(i[f]=m,n[m]++))},o=this._connectedThreshold;for(let a=0;a<t;a++)for(let d=a+1;d<t;d++)this._areConnected(e[a],e[d],o)&&r(a,d);const h=new Map;for(let a=0;a<t;a++){const d=s(a);h.has(d)||h.set(d,[]),h.get(d).push(a)}const l=[];for(const[a,d]of h)d.length>=this._minFaces&&l.push(d.map(m=>e[m]));return l}_areConnected(e,t,i){const n=Cesium.Cartesian3.distance(e.center,t.center);if(n<5)return!0;const s=Math.max(e.maxEdge,t.maxEdge)+i;for(let r=0;r<3;r++)for(let o=0;o<3;o++)if(Cesium.Cartesian3.distance(e.vertices[r],t.vertices[o])<i)return!0;return n<s&&Math.abs(Cesium.Cartesian3.dot(e.normal,t.normal))>.95}_buildEntities(e){const t=[];for(const i of e){const n=this._computeBoundingBox(i),s={id:t.length,faces:i,boundingBox:n,area:this._computeTotalArea(i),center:n.center,vertices:this._collectVertices(i),tileIds:[...new Set(i.map(r=>r.tileId))]};t.push(s)}return t.sort((i,n)=>n.area-i.area),t}_computeBoundingBox(e){let t=1/0,i=1/0,n=1/0,s=-1/0,r=-1/0,o=-1/0;for(const f of e)for(const C of f.vertices)C.x<t&&(t=C.x),C.x>s&&(s=C.x),C.y<i&&(i=C.y),C.y>r&&(r=C.y),C.z<n&&(n=C.z),C.z>o&&(o=C.z);const h=new Cesium.Cartesian3((t+s)/2,(i+r)/2,(n+o)/2),l=Cesium.Cartographic.fromCartesian(h),a=[Cesium.Math.toDegrees(l.longitude),Cesium.Math.toDegrees(l.latitude),l.height],d=Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3(t,i,n)),m=Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3(s,r,o));return{min:[Cesium.Math.toDegrees(d.longitude),Cesium.Math.toDegrees(d.latitude),d.height],max:[Cesium.Math.toDegrees(m.longitude),Cesium.Math.toDegrees(m.latitude),m.height],center:a,size:[s-t,r-i,o-n]}}_computeTotalArea(e){let t=0;for(const i of e)t+=i.area;return t}_collectVertices(e){const t=[],i=new Set;for(const n of e)for(const s of n.vertices){const r=`${s.x.toFixed(6)}_${s.y.toFixed(6)}_${s.z.toFixed(6)}`;i.has(r)||(i.add(r),t.push(s))}return t}}class ve{constructor(e){this.viewer=e,this._entityPrimitives=[],this._boundingBoxPrimitives=[],this._highlightedIndex=-1,this._entities=[],this._palette=[[.95,.3,.3],[.3,.95,.3],[.3,.3,.95],[.95,.95,.3],[.95,.3,.95],[.3,.95,.95],[.95,.6,.2],[.6,.95,.6],[.6,.6,.95],[.95,.7,.7]]}visualize(e){this.clear(),this._entities=e,this.viewer.getScene();for(let t=0;t<e.length;t++){const i=e[t],n=this._palette[t%this._palette.length];this._addEntityMesh(i,n,t===this._highlightedIndex),this._addBoundingBox(i.boundingBox,n)}}_addEntityMesh(e,t,i){const n=this.viewer.getScene(),s=[],r=[],o=[];let h=0;const l=i?[1,1,0]:t,a=i?.9:.6;for(const w of e.faces){for(let y=0;y<3;y++){const _=w.vertices[y];s.push(_.x,_.y,_.z),r.push(l[0],l[1],l[2],a)}o.push(h,h+1,h+2),h+=3}const d=new Cesium.Geometry({attributes:{position:new Cesium.GeometryAttribute({componentDatatype:Cesium.ComponentDatatype.DOUBLE,componentsPerAttribute:3,values:new Float64Array(s)}),color:Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(l[0],l[1],l[2],a))},indices:new Uint32Array(o),primitiveType:Cesium.PrimitiveType.TRIANGLES,boundingSphere:e.boundingBox}),m=Cesium.Material.fromType("Color");m.uniforms.color=new Cesium.Color(l[0],l[1],l[2],a);const f=new Cesium.GeometryInstance({geometry:d,attributes:{color:Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(l[0],l[1],l[2],a))}}),C=new Cesium.Primitive({geometryInstances:f,appearance:new Cesium.MaterialAppearance({material:m,translucentPasses:!0,closed:!0}),asynchronous:!1});n.primitives.add(C),this._entityPrimitives.push(C)}_addBoundingBox(e,t){const i=this.viewer.getScene(),n=e.min,s=e.max,r=Cesium.Cartesian3.fromDegrees(n[0],n[1],n[2]),o=Cesium.Cartesian3.fromDegrees(s[0],s[1],s[2]),h=[new Cesium.Cartesian3(r.x,r.y,r.z),new Cesium.Cartesian3(o.x,r.y,r.z),new Cesium.Cartesian3(o.x,o.y,r.z),new Cesium.Cartesian3(r.x,o.y,r.z),new Cesium.Cartesian3(r.x,r.y,o.z),new Cesium.Cartesian3(o.x,r.y,o.z),new Cesium.Cartesian3(o.x,o.y,o.z),new Cesium.Cartesian3(r.x,o.y,o.z)],l=[];for(const C of h)l.push(C.x,C.y,C.z);const a=[0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7],d=new Cesium.Geometry({attributes:{position:new Cesium.GeometryAttribute({componentDatatype:Cesium.ComponentDatatype.DOUBLE,componentsPerAttribute:3,values:new Float64Array(l)})},indices:new Uint16Array(a),primitiveType:Cesium.PrimitiveType.LINES}),m=new Cesium.GeometryInstance({geometry:d,attributes:{color:Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(t[0],t[1],t[2],1))}}),f=new Cesium.Primitive({geometryInstances:m,appearance:new Cesium.PolylineColorAppearance,asynchronous:!1});i.primitives.add(f),this._boundingBoxPrimitives.push(f)}highlightEntity(e){this._highlightedIndex=e,this._entities.length>0&&this.visualize(this._entities)}clear(){const e=this.viewer.getScene();for(const t of this._entityPrimitives)e.primitives.remove(t);this._entityPrimitives=[];for(const t of this._boundingBoxPrimitives)e.primitives.remove(t);this._boundingBoxPrimitives=[],this._entities=[],this._highlightedIndex=-1}exportGeoJSON(e){const t=[];for(const n of e){const s=n.boundingBox,r=[[s.min[0],s.min[1]],[s.max[0],s.min[1]],[s.max[0],s.max[1]],[s.min[0],s.max[1]],[s.min[0],s.min[1]]];t.push({type:"Feature",geometry:{type:"Polygon",coordinates:[r]},properties:{entityId:n.id,area:n.area,faceCount:n.faces.length,center:n.center}})}const i={type:"FeatureCollection",features:t};this._downloadJSON(i,"entities_bounding_box.geojson")}exportSpatialJSON(e){const t=e.map(i=>({id:i.id,boundingBox:i.boundingBox,area:i.area,faceCount:i.faces.length,center:i.center,minHeight:i.boundingBox.min[2],maxHeight:i.boundingBox.max[2]}));this._downloadJSON(t,"entities_spatial_params.json")}exportGLB(e){!e||e.length===0||this._exportOBJ(e)}_exportOBJ(e){let t=[],i=1;t.push("# 3D Entity Segmentation Export"),t.push("# Generated by EntityVisualizer"),t.push("");for(let r=0;r<e.length;r++){const o=e[r];t.push(`o Entity_${r}_${o.id}`);for(const h of o.faces)for(const l of h.vertices)t.push(`v ${l.x.toFixed(6)} ${l.y.toFixed(6)} ${l.z.toFixed(6)}`);for(const h of o.faces)t.push(`f ${i} ${i+1} ${i+2}`),i+=3;t.push("")}const n=t.join(`
`),s=new Blob([n],{type:"text/plain"});this._downloadBlob(s,"entities_model.obj")}_downloadJSON(e,t){const i=JSON.stringify(e,null,2),n=new Blob([i],{type:"application/json"});this._downloadBlob(n,t)}_downloadBlob(e,t){const i=URL.createObjectURL(e),n=document.createElement("a");n.href=i,n.download=t,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(i)}destroy(){this.clear()}}class _e{constructor(e){this.viewer=e,this._rectMode=!1,this._startPoint=null,this._endPoint=null,this._rectCanvas=null,this._rectCtx=null,this._onRectSelectCallback=null,this._handler=null,this._pickHandler=null,this._resizeHandler=null,this._keyHandler=null,this._initRectCanvas(),this._initHandlers()}_initRectCanvas(){const e=this.viewer.containerId,t=document.getElementById(e);this._rectCanvas=document.getElementById("rectCanvas"),this._rectCanvas||(this._rectCanvas=document.createElement("canvas"),this._rectCanvas.id="rectCanvas",this._rectCanvas.style.position="absolute",this._rectCanvas.style.top="0",this._rectCanvas.style.left="0",this._rectCanvas.style.cursor="crosshair",this._rectCanvas.style.display="none",this._rectCanvas.style.zIndex="10",this._rectCanvas.style.pointerEvents="auto",t?(t.style.position=t.style.position||"relative",t.appendChild(this._rectCanvas)):document.body.appendChild(this._rectCanvas)),this._rectCtx=this._rectCanvas.getContext("2d")}_initHandlers(){this._handler=new Cesium.ScreenSpaceEventHandler(this._rectCanvas),this._handler.setInputAction(e=>{this._rectMode&&(this._startPoint={x:e.endPosition.x,y:e.endPosition.y},this._endPoint=null,this._clearRect())},Cesium.ScreenSpaceEventType.LEFT_DOWN),this._handler.setInputAction(e=>{!this._rectMode||!this._startPoint||(this._endPoint={x:e.endPosition.x,y:e.endPosition.y},this._drawRect())},Cesium.ScreenSpaceEventType.MOUSE_MOVE),this._handler.setInputAction(()=>{if(!this._rectMode)return;if(!this._startPoint||!this._endPoint){this._cancelRect();return}const e=this._getNormalizedRect();this._clearRect(),this._startPoint=null,this._endPoint=null,this._onRectSelectCallback&&e&&this._onRectSelectCallback(e),this._rectMode=!1,this._rectCanvas.style.display="none"},Cesium.ScreenSpaceEventType.LEFT_UP),this._handler.setInputAction(()=>{this._rectMode&&this._cancelRect()},Cesium.ScreenSpaceEventType.RIGHT_DOWN),this._resizeHandler=()=>this._updateCanvasSize(),window.addEventListener("resize",this._resizeHandler),this._keyHandler=e=>{e.key==="Escape"&&this._rectMode&&this._cancelRect()},window.addEventListener("keydown",this._keyHandler)}_updateCanvasSize(){if(!this._rectCanvas)return;const e=this.viewer.containerId,t=document.getElementById(e),i=this.viewer.getCanvas();if(t){const n=t.getBoundingClientRect();this._rectCanvas.width=i.width,this._rectCanvas.height=i.height,this._rectCanvas.style.width=n.width+"px",this._rectCanvas.style.height=n.height+"px"}else this._rectCanvas.width=i.width,this._rectCanvas.height=i.height}setRectMode(e){this._rectMode=e,e?(this._updateCanvasSize(),this._rectCanvas.style.display="block",this._startPoint=null,this._endPoint=null,this._clearRect()):(this._rectCanvas.style.display="none",this._clearRect(),this._startPoint=null,this._endPoint=null)}onRectSelect(e){this._onRectSelectCallback=e}_drawRect(){if(!this._startPoint||!this._endPoint)return;const e=this._rectCtx;e.clearRect(0,0,this._rectCanvas.width,this._rectCanvas.height);const t=Math.min(this._startPoint.x,this._endPoint.x),i=Math.min(this._startPoint.y,this._endPoint.y),n=Math.abs(this._endPoint.x-this._startPoint.x),s=Math.abs(this._endPoint.y-this._startPoint.y);e.fillStyle="rgba(79, 195, 247, 0.2)",e.fillRect(t,i,n,s),e.strokeStyle="#4fc3f7",e.lineWidth=2,e.strokeRect(t,i,n,s)}_clearRect(){this._rectCtx&&this._rectCtx.clearRect(0,0,this._rectCanvas.width,this._rectCanvas.height)}_cancelRect(){this._clearRect(),this._startPoint=null,this._endPoint=null,this._rectMode=!1,this._rectCanvas.style.display="none"}_getNormalizedRect(){if(!this._startPoint||!this._endPoint)return null;const e=Math.min(this._startPoint.x,this._endPoint.x),t=Math.min(this._startPoint.y,this._endPoint.y),i=Math.abs(this._endPoint.x-this._startPoint.x),n=Math.abs(this._endPoint.y-this._startPoint.y);if(i<5||n<5)return null;const s=this.viewer.getCanvas();return{x:e/s.width,y:t/s.height,width:i/s.width,height:n/s.height,pixelRect:{x:e,y:t,width:i,height:n}}}getScreenRect(){return this._getNormalizedRect()}screenToWorld(e,t){const i=this.viewer.viewer,n=i.camera.getPickRay(new Cesium.Cartesian2(e,t));return n?i.scene.globe.pick(n,i.scene.globe.ellipsoid):null}onEntityClick(e){this.removeEntityClickHandler(),this._pickHandler=new Cesium.ScreenSpaceEventHandler(this.viewer.viewer.scene.canvas),this._pickHandler.setInputAction(t=>{if(this._rectMode)return;const i=this.viewer.viewer.scene.pick(t.position);i&&i.primitive&&e(i)},Cesium.ScreenSpaceEventType.LEFT_CLICK)}removeEntityClickHandler(){this._pickHandler&&(this._pickHandler.destroy(),this._pickHandler=null)}getCurrentViewBounds(){const t=this.viewer.viewer.camera.computeViewRectangle();return t?{west:Cesium.Math.toDegrees(t.west),east:Cesium.Math.toDegrees(t.east),south:Cesium.Math.toDegrees(t.south),north:Cesium.Math.toDegrees(t.north)}:null}destroy(){this.setRectMode(!1),this._handler&&(this._handler.destroy(),this._handler=null),this.removeEntityClickHandler(),this._resizeHandler&&(window.removeEventListener("resize",this._resizeHandler),this._resizeHandler=null),this._keyHandler&&(window.removeEventListener("keydown",this._keyHandler),this._keyHandler=null),this._rectCanvas&&this._rectCanvas.parentNode&&this._rectCanvas.parentNode.removeChild(this._rectCanvas),this._rectCanvas=null,this._rectCtx=null}}const xe=200;function g(c,e="info"){const t=new Date().toLocaleTimeString("zh-CN",{hour12:!1}),i=document.getElementById("logContent");if(i){const s={info:"#4fc3f7",success:"#81c784",warn:"#ffb74d",error:"#ef5350"}[e]||"#ccc",r=document.createElement("div");for(r.style.cssText=`color:${s};font-size:11px;line-height:1.5;padding:1px 0;word-break:break-all;`,r.textContent=`[${t}] ${c}`,i.appendChild(r),i.scrollTop=i.scrollHeight;i.children.length>xe;)i.removeChild(i.firstChild)}console.log(`[${e.toUpperCase()}] ${c}`)}function be(){const c=document.getElementById("logContent");c&&(c.innerHTML="")}const u={viewer:null,tileLoader:null,multiViewRenderer:null,segmentEngine:null,backProjector:null,spatialCluster:null,entityVisualizer:null,interactionController:null,entities:[],extractMode:"viewport",config:{views:["top","angle","front"],connectThreshold:.5,minFaces:20,filterGround:!0,groundThreshold:.1}},p=c=>document.getElementById(c);function A(c){const e=p("loadingOverlay");e.style.display="block",p("loadingText").textContent=c||"处理中..."}function P(){p("loadingOverlay").style.display="none"}function v(c){p("statusText").textContent=c,g(c,"info")}async function Me(){g("系统初始化开始","info"),g(`浏览器: ${navigator.userAgent.split(") ").pop()}`,"info");const c=(()=>{try{const e=document.createElement("canvas");return!!(e.getContext("webgl")||e.getContext("experimental-webgl"))}catch{return!1}})();g(`WebGL 支持: ${c?"是":"否"}`,c?"success":"warn"),A("初始化三维引擎..."),v("初始化三维引擎...");try{g("创建 Viewer 实例...","info"),u.viewer=new me("cesiumContainer"),g("Viewer 实例创建成功","success"),g("初始化瓦片加载器...","info"),u.tileLoader=new ge(u.viewer),g("初始化多视角渲染器...","info"),u.multiViewRenderer=new pe(u.viewer),g("初始化分割引擎...","info"),u.segmentEngine=new Ce,g("初始化三维反投影器...","info"),u.backProjector=new we(u.viewer),g("初始化空间聚类器...","info"),u.spatialCluster=new ye,g("初始化实体可视化器...","info"),u.entityVisualizer=new ve(u.viewer),g("初始化交互控制器...","info"),u.interactionController=new _e(u.viewer),g("所有模块初始化完成","success"),u.viewer.onTileCountChange(e=>p("tileCount").textContent=e),u.viewer.onFPSUpdate(e=>p("fpsCounter").textContent=e.toFixed(0)),u.interactionController.onRectSelect(async e=>{A("框选区域提取中..."),v("框选提取中..."),await ee(e),P()}),u.interactionController.onEntityClick(e=>{const t=u.entityVisualizer._entityPrimitives.indexOf(e.primitive);if(t>=0){const i=Math.floor(t/2);J(i)}}),P(),v("就绪 - 请加载瓦片数据"),Se(),W("viewport"),g("系统就绪，可以开始使用","success")}catch(e){P(),g("初始化失败: "+(e.message||String(e)),"error");const t=e.message||String(e);t.includes("WebGL")||!c?(v("WebGL 不可用 - 请使用支持 WebGL 的浏览器"),Te(t)):v("初始化失败: "+t)}}function Te(c){const e=p("cesiumContainer");e.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:center;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;text-align:center;padding:20px;">
      <div>
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h2 style="margin-bottom:12px;color:#ff6b6b;">WebGL 不可用</h2>
        <p style="margin-bottom:8px;line-height:1.6;">${c}</p>
        <p style="color:#888;font-size:14px;margin-top:16px;">
          推荐浏览器：Chrome 90+ / Firefox 88+ / Edge 90+<br>
          请确保显卡驱动已更新，并在浏览器设置中启用硬件加速
        </p>
      </div>
    </div>
  `,e.style.background="#1a1a2e",g("已显示 WebGL 不可用提示","warn")}function Se(){p("loadTilesBtn").addEventListener("click",Ee),p("flyHomeBtn").addEventListener("click",()=>{u.viewer&&u.viewer.flyHome()}),p("extractBtn").addEventListener("click",ke),p("clearBtn").addEventListener("click",Pe),p("modeViewportBtn").addEventListener("click",()=>W("viewport")),p("modeRectBtn").addEventListener("click",()=>W("rect")),document.querySelectorAll(".view-badge").forEach(c=>{c.addEventListener("click",()=>{const e=c.dataset.view;u.config.views.includes(e)?(u.config.views=u.config.views.filter(t=>t!==e),c.classList.remove("active")):(u.config.views.push(e),c.classList.add("active"))})}),p("threshold").addEventListener("input",c=>{u.config.connectThreshold=parseFloat(c.target.value),p("thresholdVal").textContent=c.target.value}),p("minFaces").addEventListener("input",c=>{u.config.minFaces=parseInt(c.target.value),p("minFacesVal").textContent=c.target.value}),p("filterGround").addEventListener("change",c=>{u.config.filterGround=c.target.checked}),p("exportGeoJSON").addEventListener("click",()=>{u.entities.length>0&&(u.entityVisualizer.exportGeoJSON(u.entities),g("导出 GeoJSON 包围盒","success"))}),p("exportJSON").addEventListener("click",()=>{u.entities.length>0&&(u.entityVisualizer.exportSpatialJSON(u.entities),g("导出实体参数 JSON","success"))}),p("clearLogBtn").addEventListener("click",()=>{be(),g("日志已清空","info")}),p("toggleLogBtn").addEventListener("click",()=>{const c=p("logPanel");c.classList.toggle("collapsed");const e=p("toggleLogBtn");c.classList.contains("collapsed")?e.textContent="▲":e.textContent="▼"}),p("logPanelHeader").addEventListener("click",c=>{if(c.target.id==="clearLogBtn"||c.target.id==="toggleLogBtn")return;const e=p("logPanel");e.classList.toggle("collapsed");const t=p("toggleLogBtn");e.classList.contains("collapsed")?t.textContent="▲":t.textContent="▼"}),g("事件绑定完成","info")}function W(c){u.extractMode=c,p("modeViewportBtn").classList.toggle("active",c==="viewport"),p("modeRectBtn").classList.toggle("active",c==="rect"),u.interactionController.setRectMode(c==="rect"),c==="rect"?(v("请在场景中框选区域..."),g("切换到框选提取模式","info")):(v('就绪 - 点击"开始提取"进行全视口提取'),g("切换到全视口提取模式","info"))}async function Ee(){const c=p("tilesetUrl").value.trim();if(!c){g("瓦片 URL 为空","warn");return}A("加载瓦片数据..."),v("加载瓦片中..."),g(`开始加载瓦片: ${c}`,"info");try{const e=performance.now();await u.tileLoader.load(c);const t=((performance.now()-e)/1e3).toFixed(2);v("瓦片加载完成 - 可开始实体提取"),p("extractBtn").disabled=!1,g(`瓦片加载完成，耗时 ${t}s`,"success")}catch(e){g("瓦片加载失败: "+e.message,"error"),v("瓦片加载失败: "+e.message)}finally{P()}}async function ke(){u.extractMode==="viewport"?(A("全视口实体提取中..."),v("全视口提取中..."),g("开始全视口实体提取","info"),await ee(null),P()):(v("请在场景中框选区域..."),g("等待用户框选区域...","info"),u.interactionController.setRectMode(!0))}async function ee(c){const e=performance.now();try{const t=u.config.views;g(`配置视角: ${t.join(", ")}`,"info"),v("多视角渲染采样..."),g("开始多视角渲染采样...","info");const i=t.map(a=>c?u.multiViewRenderer.getViewWithRect(a,c):u.multiViewRenderer.getView(a)),n=await u.multiViewRenderer.renderViews(i);g(`多视角渲染完成 (${n.length} 个视角)`,"success"),v("AI模型分割推理..."),g("开始分割推理...","info");const s=await u.segmentEngine.segmentMultiView(n);g("分割推理完成","success"),v("掩码融合与三维反投影..."),g("执行三维反投影...","info");const r=u.tileLoader.getVisibleTriangles();g(`可见三角面片数: ${r.length}`,"info");const o=u.backProjector.projectTo3D(n,s,r);g(`反投影面片数: ${o.length}`,"success"),v("空间连通聚类..."),g("执行空间连通聚类...","info");const h=u.spatialCluster.cluster(o,{connectThreshold:u.config.connectThreshold,minFaces:u.config.minFaces,filterGround:u.config.filterGround,groundThreshold:u.config.groundThreshold});g(`聚类完成: ${h.length} 个实体`,"success"),v("实体可视化..."),g("渲染实体可视化...","info"),u.entityVisualizer.visualize(h),u.interactionController.onEntityClick(a=>{const d=u.entityVisualizer._entityPrimitives.indexOf(a.primitive);if(d>=0){const m=Math.floor(d/2);J(m)}}),u.entities=h;const l=((performance.now()-e)/1e3).toFixed(2);Le(h,l),p("entityCountStatus").textContent=h.length,v(`提取完成 - ${h.length} 个实体, 耗时 ${l}s`),p("resultPanel").classList.remove("hidden"),g(`实体提取完成: ${h.length} 个实体，耗时 ${l}s`,"success")}catch(t){g("提取失败: "+t.message,"error"),v("提取失败: "+t.message)}}function J(c){c<0||c>=u.entities.length||(u.entityVisualizer.highlightEntity(c),u.viewer.flyToEntity(u.entities[c]),g(`高亮实体 #${c+1}`,"info"),document.querySelectorAll(".entity-item").forEach(e=>{e.classList.toggle("selected",parseInt(e.dataset.entityId)===c)}))}function Le(c,e){p("entityCount").textContent=c.length,p("processTime").textContent=e+"s";const t=p("entityList");t.innerHTML="",c.forEach((i,n)=>{const s=document.createElement("div");s.className="entity-item",s.dataset.entityId=n;const r=i.boundingBox.center,o=i.area.toFixed(1),h=i.faces.length;s.innerHTML=`
      <div class="entity-id">实体 #${n+1}</div>
      <div class="entity-info">面片: ${h} | 面积: ${o}m²</div>
      <div class="entity-info">中心: (${r[0].toFixed(4)}, ${r[1].toFixed(4)}, ${r[2].toFixed(4)})</div>
    `,s.addEventListener("click",()=>J(n)),t.appendChild(s)})}function Pe(){u.entities=[],u.entityVisualizer&&u.entityVisualizer.clear(),u.segmentEngine&&u.segmentEngine.clear(),p("resultPanel").classList.add("hidden"),p("entityCountStatus").textContent="0",v("已清除"),g("结果已清除","info")}Me();
