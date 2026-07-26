class SpatialCluster {
  constructor() {
    this._connectedThreshold = 0.5;
    this._minFaces = 20;
    this._filterGround = true;
    this._groundThreshold = 0.1;
  }

  cluster(triangles, options) {
    this._connectedThreshold = options.connectThreshold || 0.5;
    this._minFaces = options.minFaces || 20;
    this._filterGround = options.filterGround !== undefined ? options.filterGround : true;
    this._groundThreshold = options.groundThreshold || 0.1;

    if (!triangles || triangles.length === 0) return [];

    const preprocessed = this._preprocess(triangles);
    const filtered = this._filterGroundTriangles(preprocessed);
    const clusters = this._connectedComponentAnalysis(filtered);
    const entities = this._buildEntities(clusters);

    return entities;
  }

  _preprocess(triangles) {
    return triangles.map((tri, index) => {
      const vertices = tri.vertices;
      const v0 = vertices[0];
      const v1 = vertices[1];
      const v2 = vertices[2];

      const center = new Cesium.Cartesian3(
        (v0.x + v1.x + v2.x) / 3,
        (v0.y + v1.y + v2.y) / 3,
        (v0.z + v1.z + v2.z) / 3
      );

      const edges = [
        { v0: 0, v1: 1, length: Cesium.Cartesian3.distance(v0, v1) },
        { v0: 1, v1: 2, length: Cesium.Cartesian3.distance(v1, v2) },
        { v0: 2, v1: 0, length: Cesium.Cartesian3.distance(v2, v0) }
      ];

      const maxEdge = Math.max(edges[0].length, edges[1].length, edges[2].length);
      const normal = this._computeNormal(v0, v1, v2);

      return {
        id: index,
        vertices: [v0, v1, v2],
        center: center,
        normal: normal,
        maxEdge: maxEdge,
        area: this._computeArea(v0, v1, v2),
        tileId: tri.tileId || 'unknown'
      };
    });
  }

  _computeNormal(v0, v1, v2) {
    const e1 = Cesium.Cartesian3.subtract(v1, v0, new Cesium.Cartesian3());
    const e2 = Cesium.Cartesian3.subtract(v2, v0, new Cesium.Cartesian3());
    const normal = Cesium.Cartesian3.cross(e1, e2, new Cesium.Cartesian3());
    const len = Cesium.Cartesian3.magnitude(normal);
    if (len > 0) {
      return Cesium.Cartesian3.divideByScalar(normal, len, new Cesium.Cartesian3());
    }
    return new Cesium.Cartesian3(0, 0, 1);
  }

  _computeArea(v0, v1, v2) {
    const e1 = Cesium.Cartesian3.subtract(v1, v0, new Cesium.Cartesian3());
    const e2 = Cesium.Cartesian3.subtract(v2, v0, new Cesium.Cartesian3());
    const cross = Cesium.Cartesian3.cross(e1, e2, new Cesium.Cartesian3());
    return Cesium.Cartesian3.magnitude(cross) / 2;
  }

  _filterGroundTriangles(triangles) {
    if (!this._filterGround) return triangles;

    const trianglesByTile = new Map();
    for (const tri of triangles) {
      if (!trianglesByTile.has(tri.tileId)) {
        trianglesByTile.set(tri.tileId, []);
      }
      trianglesByTile.get(tri.tileId).push(tri);
    }

    const groundTileIds = new Set();
    for (const [tileId, tileTris] of trianglesByTile) {
      if (tileTris.length < 3) continue;

      let avgZ = 0;
      for (const t of tileTris) {
        avgZ += t.center.z;
      }
      avgZ /= tileTris.length;

      let variance = 0;
      for (const t of tileTris) {
        variance += (t.center.z - avgZ) ** 2;
      }
      variance = Math.sqrt(variance / tileTris.length);

      if (variance < this._groundThreshold * 10 && tileTris.length > 50) {
        groundTileIds.add(tileId);
      }
    }

    return triangles.filter(t => !groundTileIds.has(t.tileId));
  }

  _connectedComponentAnalysis(triangles) {
    if (triangles.length === 0) return [];

    const n = triangles.length;
    const parent = new Int32Array(n);
    const rank = new Int32Array(n);

    for (let i = 0; i < n; i++) {
      parent[i] = i;
    }

    const find = (x) => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    };

    const union = (x, y) => {
      const rx = find(x);
      const ry = find(y);
      if (rx !== ry) {
        if (rank[rx] < rank[ry]) {
          parent[rx] = ry;
        } else if (rank[rx] > rank[ry]) {
          parent[ry] = rx;
        } else {
          parent[ry] = rx;
          rank[rx]++;
        }
      }
    };

    const threshold = this._connectedThreshold;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this._areConnected(triangles[i], triangles[j], threshold)) {
          union(i, j);
        }
      }
    }

    const clusterMap = new Map();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!clusterMap.has(root)) {
        clusterMap.set(root, []);
      }
      clusterMap.get(root).push(i);
    }

    const clusters = [];
    for (const [root, indices] of clusterMap) {
      if (indices.length >= this._minFaces) {
        clusters.push(indices.map(i => triangles[i]));
      }
    }

    return clusters;
  }

  _areConnected(triA, triB, threshold) {
    const centerDist = Cesium.Cartesian3.distance(triA.center, triB.center);
    if (centerDist < 5) return true;

    const maxAllowedDist = Math.max(triA.maxEdge, triB.maxEdge) + threshold;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dist = Cesium.Cartesian3.distance(triA.vertices[i], triB.vertices[j]);
        if (dist < threshold) return true;
      }
    }

    if (centerDist < maxAllowedDist) {
      const normalDot = Math.abs(
        Cesium.Cartesian3.dot(triA.normal, triB.normal)
      );
      if (normalDot > 0.95) {
        return true;
      }
    }

    return false;
  }

  _buildEntities(clusters) {
    const entities = [];

    for (const cluster of clusters) {
      const boundingBox = this._computeBoundingBox(cluster);
      const entity = {
        id: entities.length,
        faces: cluster,
        boundingBox: boundingBox,
        area: this._computeTotalArea(cluster),
        center: boundingBox.center,
        vertices: this._collectVertices(cluster),
        tileIds: [...new Set(cluster.map(t => t.tileId))]
      };
      entities.push(entity);
    }

    entities.sort((a, b) => b.area - a.area);

    return entities;
  }

  _computeBoundingBox(triangles) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const tri of triangles) {
      for (const v of tri.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
      }
    }

    const center = new Cesium.Cartesian3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );

    const centerCarto = Cesium.Cartographic.fromCartesian(center);
    const centerDegrees = [
      Cesium.Math.toDegrees(centerCarto.longitude),
      Cesium.Math.toDegrees(centerCarto.latitude),
      centerCarto.height
    ];

    const minCarto = Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3(minX, minY, minZ));
    const maxCarto = Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3(maxX, maxY, maxZ));

    return {
      min: [
        Cesium.Math.toDegrees(minCarto.longitude),
        Cesium.Math.toDegrees(minCarto.latitude),
        minCarto.height
      ],
      max: [
        Cesium.Math.toDegrees(maxCarto.longitude),
        Cesium.Math.toDegrees(maxCarto.latitude),
        maxCarto.height
      ],
      center: centerDegrees,
      size: [
        maxX - minX,
        maxY - minY,
        maxZ - minZ
      ]
    };
  }

  _computeTotalArea(triangles) {
    let area = 0;
    for (const tri of triangles) {
      area += tri.area;
    }
    return area;
  }

  _collectVertices(triangles) {
    const vertices = [];
    const seen = new Set();

    for (const tri of triangles) {
      for (const v of tri.vertices) {
        const key = `${v.x.toFixed(6)}_${v.y.toFixed(6)}_${v.z.toFixed(6)}`;
        if (!seen.has(key)) {
          seen.add(key);
          vertices.push(v);
        }
      }
    }

    return vertices;
  }
}

export default SpatialCluster;
