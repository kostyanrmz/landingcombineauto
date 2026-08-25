import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import * as THREE from "three";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "particles");

function collectTriangles(doc) {
  const tris = [];
  const mat = new THREE.Matrix4();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    mat.fromArray(node.getWorldMatrix());
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const indices = prim.getIndices();
      const array = pos.getArray();
      const pushTri = (ia, ib, ic) => {
        a.set(array[ia * 3], array[ia * 3 + 1], array[ia * 3 + 2]).applyMatrix4(mat);
        b.set(array[ib * 3], array[ib * 3 + 1], array[ib * 3 + 2]).applyMatrix4(mat);
        c.set(array[ic * 3], array[ic * 3 + 1], array[ic * 3 + 2]).applyMatrix4(mat);
        const area = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
        if (area > 1e-10) tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), area });
      };
      if (indices) {
        const idx = indices.getArray();
        for (let i = 0; i < idx.length; i += 3) pushTri(idx[i], idx[i + 1], idx[i + 2]);
      } else {
        const n = pos.getCount();
        for (let i = 0; i < n; i += 3) pushTri(i, i + 1, i + 2);
      }
    }
  }
  return tris;
}

function sampleSurface(tris, count) {
  const cdf = new Float64Array(tris.length);
  let acc = 0;
  for (let i = 0; i < tris.length; i++) {
    acc += tris[i].area;
    cdf[i] = acc;
  }
  const positions = new Float32Array(count * 3);
  const pick = () => {
    const r = Math.random() * acc;
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return tris[lo];
  };
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = pick();
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    p.copy(t.a)
      .addScaledVector(t.b.clone().sub(t.a), u)
      .addScaledVector(t.c.clone().sub(t.a), v);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  return positions;
}

function normalize(positions, targetSize) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    box.expandByPoint(v.set(positions[i], positions[i + 1], positions[i + 2]));
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const longest = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / longest;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - center.x) * scale;
    positions[i + 1] = (positions[i + 1] - center.y) * scale;
    positions[i + 2] = (positions[i + 2] - center.z) * scale;
  }
  return {
    count: positions.length / 3,
    scale,
    size: [+(size.x * scale).toFixed(3), +(size.y * scale).toFixed(3), +(size.z * scale).toFixed(3)],
  };
}

function augerHint(positions) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  if (spanX >= spanZ) {
    return { axis: 0, from: minX, to: maxX, side: Math.abs(maxX) > Math.abs(minX) ? 1 : -1 };
  }
  return { axis: 2, from: minZ, to: maxZ, side: Math.abs(maxZ) > Math.abs(minZ) ? 1 : -1 };
}

async function cloudFrom(file, count, targetSize) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  const positions = sampleSurface(collectTriangles(doc), count);
  const meta = normalize(positions, targetSize);
  meta.auger = augerHint(positions);
  return { positions, meta };
}

function writeBin(name, positions) {
  fs.writeFileSync(path.join(outDir, `${name}.bin`), Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const combine = await cloudFrom(path.join(root, "public/models/combine.glb"), 52000, 4.6);
  const truck = await cloudFrom(path.join(root, "public/models/truck.glb"), 36000, 3.8);
  writeBin("combine", combine.positions);
  writeBin("truck", truck.positions);
  const meta = {
    combine: combine.meta,
    truck: truck.meta,
    credits: {
      combine: "John Deere CTS Combine — OwenNielsen, Sketchfab, CC-BY-4.0",
      truck: "Japanese Dump Truck — Pavel Gorbachev, Sketchfab, CC-BY-4.0",
    },
  };
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
