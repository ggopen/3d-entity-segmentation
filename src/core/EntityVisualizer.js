import * as Cesium from 'cesium';

class EntityVisualizer {
  constructor(viewer) {
    this.viewer = viewer;
    this._entityPrimitives = [];
    this._boundingBoxPrimitives = [];
    this._highlightedIndex = -1;
    this._entities = [];
    this._palette = [
      [0.95, 0.3, 0.3],
      [0.3, 0.95, 0.3],
      [0.3, 0.3, 0.95],
      [0.95, 0.95, 0.3],
      [0.95, 0.3, 0.95],
      [0.3, 0.95, 0.95],
      [0.95, 0.6, 0.2],
      [0.6, 0.95, 0.6],
      [0.6, 0.6, 0.95],
      [0.95, 0.7, 0.7]
    ];
  }

  visualize(entities) {
    this.clear();
    this._entities = entities;

    const scene = this.viewer.getScene();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const color = this._palette[i % this._palette.length];

      this._addEntityMesh(entity, color, i === this._highlightedIndex);
      this._addBoundingBox(entity.boundingBox, color);
    }
  }

  _addEntityMesh(entity, color, highlighted) {
    const scene = this.viewer.getScene();

    const positions = [];
    const colors = [];
    const indices = [];
    let vertexOffset = 0;

    const baseColor = highlighted
      ? [1.0, 1.0, 0.0]
      : color;
    const alpha = highlighted ? 0.9 : 0.6;

    for (const face of entity.faces) {
      for (let j = 0; j < 3; j++) {
        const v = face.vertices[j];
        positions.push(v.x, v.y, v.z);
        colors.push(baseColor[0], baseColor[1], baseColor[2], alpha);
      }
      indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
      vertexOffset += 3;
    }

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: new Float64Array(positions)
        }),
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(baseColor[0], baseColor[1], baseColor[2], alpha)
        )
      },
      indices: new Uint32Array(indices),
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: entity.boundingBox
    });

    const material = Cesium.Material.fromType('Color');
    material.uniforms.color = new Cesium.Color(
      baseColor[0], baseColor[1], baseColor[2], alpha
    );

    const instance = new Cesium.GeometryInstance({
      geometry: geometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(baseColor[0], baseColor[1], baseColor[2], alpha)
        )
      }
    });

    const primitive = new Cesium.Primitive({
      geometryInstances: instance,
      appearance: new Cesium.MaterialAppearance({
        material: material,
        translucentPasses: true,
        closed: true
      }),
      asynchronous: false
    });

    scene.primitives.add(primitive);
    this._entityPrimitives.push(primitive);
  }

  _addBoundingBox(boundingBox, color) {
    const scene = this.viewer.getScene();

    const min = boundingBox.min;
    const max = boundingBox.max;

    const minCart = Cesium.Cartesian3.fromDegrees(min[0], min[1], min[2]);
    const maxCart = Cesium.Cartesian3.fromDegrees(max[0], max[1], max[2]);

    const corners = [
      new Cesium.Cartesian3(minCart.x, minCart.y, minCart.z),
      new Cesium.Cartesian3(maxCart.x, minCart.y, minCart.z),
      new Cesium.Cartesian3(maxCart.x, maxCart.y, minCart.z),
      new Cesium.Cartesian3(minCart.x, maxCart.y, minCart.z),
      new Cesium.Cartesian3(minCart.x, minCart.y, maxCart.z),
      new Cesium.Cartesian3(maxCart.x, minCart.y, maxCart.z),
      new Cesium.Cartesian3(maxCart.x, maxCart.y, maxCart.z),
      new Cesium.Cartesian3(minCart.x, maxCart.y, maxCart.z)
    ];

    const positions = [];
    for (const corner of corners) {
      positions.push(corner.x, corner.y, corner.z);
    }

    const indices = [
      0, 1, 1, 2, 2, 3, 3, 0,
      4, 5, 5, 6, 6, 7, 7, 4,
      0, 4, 1, 5, 2, 6, 3, 7
    ];

    const lineGeometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: new Float64Array(positions)
        })
      },
      indices: new Uint16Array(indices),
      primitiveType: Cesium.PrimitiveType.LINES
    });

    const lineInstance = new Cesium.GeometryInstance({
      geometry: lineGeometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(color[0], color[1], color[2], 1.0)
        )
      }
    });

    const linePrimitive = new Cesium.Primitive({
      geometryInstances: lineInstance,
      appearance: new Cesium.PolylineColorAppearance(),
      asynchronous: false
    });

    scene.primitives.add(linePrimitive);
    this._boundingBoxPrimitives.push(linePrimitive);
  }

  highlightEntity(index) {
    this._highlightedIndex = index;
    if (this._entities.length > 0) {
      this.visualize(this._entities);
    }
  }

  clear() {
    const scene = this.viewer.getScene();

    for (const p of this._entityPrimitives) {
      scene.primitives.remove(p);
    }
    this._entityPrimitives = [];

    for (const p of this._boundingBoxPrimitives) {
      scene.primitives.remove(p);
    }
    this._boundingBoxPrimitives = [];

    this._entities = [];
    this._highlightedIndex = -1;
  }

  exportGeoJSON(entities) {
    const features = [];

    for (const entity of entities) {
      const bbox = entity.boundingBox;
      const polygon = [
        [bbox.min[0], bbox.min[1]],
        [bbox.max[0], bbox.min[1]],
        [bbox.max[0], bbox.max[1]],
        [bbox.min[0], bbox.max[1]],
        [bbox.min[0], bbox.min[1]]
      ];

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygon]
        },
        properties: {
          entityId: entity.id,
          area: entity.area,
          faceCount: entity.faces.length,
          center: entity.center
        }
      });
    }

    const geoJSON = {
      type: 'FeatureCollection',
      features: features
    };

    this._downloadJSON(geoJSON, 'entities_bounding_box.geojson');
  }

  exportSpatialJSON(entities) {
    const data = entities.map(entity => ({
      id: entity.id,
      boundingBox: entity.boundingBox,
      area: entity.area,
      faceCount: entity.faces.length,
      center: entity.center,
      minHeight: entity.boundingBox.min[2],
      maxHeight: entity.boundingBox.max[2]
    }));

    this._downloadJSON(data, 'entities_spatial_params.json');
  }

  exportGLB(entities) {
    if (!entities || entities.length === 0) return;
    this._exportOBJ(entities);
  }

  _exportOBJ(entities) {
    let objLines = [];
    let globalVertexCount = 1;

    objLines.push('# 3D Entity Segmentation Export');
    objLines.push('# Generated by EntityVisualizer');
    objLines.push('');

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      objLines.push(`o Entity_${i}_${entity.id}`);

      for (const face of entity.faces) {
        for (const v of face.vertices) {
          objLines.push(
            `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`
          );
        }
      }

      for (const face of entity.faces) {
        objLines.push(
          `f ${globalVertexCount} ${globalVertexCount + 1} ${globalVertexCount + 2}`
        );
        globalVertexCount += 3;
      }

      objLines.push('');
    }

    const objContent = objLines.join('\n');
    const blob = new Blob([objContent], { type: 'text/plain' });
    this._downloadBlob(blob, 'entities_model.obj');
  }

  _downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    this._downloadBlob(blob, filename);
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  destroy() {
    this.clear();
  }
}

export default EntityVisualizer;