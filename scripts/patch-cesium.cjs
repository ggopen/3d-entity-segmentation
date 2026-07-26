const fs = require('fs');
const path = require('path');

const cesiumPath = path.join(__dirname, '..', 'dist', 'cesium', 'Cesium.js');
if (!fs.existsSync(cesiumPath)) {
  console.log('Cesium.js not found, skipping patch');
  process.exit(0);
}

let code = fs.readFileSync(cesiumPath, 'utf-8');

if (code.indexOf('window.Cesium = (()=>{') !== -1) {
  console.log('Cesium.js already patched, skipping');
  process.exit(0);
}

const marker = 'var Cesium=(()=>{';
const startIdx = code.indexOf(marker);
if (startIdx === -1) {
  console.log('Could not find var Cesium=(()=>{ in Cesium.js');
  process.exit(0);
}

const newPrefix = 'window.Cesium = (()=>{';
const patched = code.substring(0, startIdx) + newPrefix + code.substring(startIdx + marker.length);

fs.writeFileSync(cesiumPath, patched, 'utf-8');
console.log('Cesium.js patched: window.Cesium = (()=>{...})()');
