"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const BRAND = new THREE.Color("#aeccb6");
const BRAND2 = new THREE.Color("#bed8c4");
const VEHICLE = new THREE.Color("#b4d4bc");
const VEHICLE2 = new THREE.Color("#bcdac4");
const WHEAT = new THREE.Color("#e8c547");
const NAV = new THREE.Color("#4da6ff");
const LOCK = new THREE.Color("#e11d48");
const GOLD = new THREE.Color("#d4a84b");

const COMBINE = new THREE.Vector3(-4.2, 0.82, 0);
/** Front = local +Z → world −Z (minZ local is rear) */
const WAVE_ANGLE = -Math.PI / 2;
const WAVE_DIST = 8.8;
const TRUCK_FAR = new THREE.Vector3(COMBINE.x, 0.8, COMBINE.z - WAVE_DIST);
/** Camera stop past the truck (behind its rear, away from combine) */
const TRUCK_BEYOND = new THREE.Vector3(TRUCK_FAR.x + 1.2, 3.55, TRUCK_FAR.z - 5.2);
const TRUCK_NEAR = new THREE.Vector3(-6.28, 0.82, 0);
const COMBINE_YAW = Math.PI;
/** Far — cab toward combine; near — parallel side unload, same heading as combine */
const TRUCK_FAR_YAW = 0;
const TRUCK_NEAR_YAW = Math.PI;
const CAM = 1.2;
/** Cab — center, slightly lower, ~30% forward (+Z local) */
const TERMINAL_LOCAL = new THREE.Vector3(0, 0.5, 0.62);
/** Auger lock — +X unload side */
const AUGER_LOCK_LOCAL = new THREE.Vector3(0.36, 0.48, 0.1);
const AUGER_MOUNT = new THREE.Vector3(0.38, 0.48, 0.06);
/** Straight spout tip — above truck bed, ~20° from horizontal */
const PIPE_TIP_LOCAL = new THREE.Vector3(2.04, 1.06, 0.05);
const CALLOUT_TERMINAL = new THREE.Vector3(-0.1, 0.55, 0.34);
const CALLOUT_LOCK = new THREE.Vector3(0.1, 0.55, 0.32);
const CALLOUT_UNLOCK = new THREE.Vector3(0.08, 0.62, 0.3);
const COMBINE_ANCHOR = new THREE.Vector3(-4.2, 1.55, 0);
const TRUCK_CARD_OFFSET = new THREE.Vector3(0, 0.95, 0);

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function range(p, a, b) {
  return clamp((p - a) / Math.max(0.0001, b - a), 0, 1);
}
function smooth(t) {
  return t * t * (3 - 2 * t);
}
function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function combineLocalToWorld(local) {
  const v = local.clone();
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), COMBINE_YAW);
  return COMBINE.clone().add(v);
}

function orbitPose(center, radius, elevation, azimuth, lookY = 0.55) {
  const r = radius * CAM;
  const e = elevation * CAM;
  return {
    pos: [center.x + Math.cos(azimuth) * r, center.y + e, center.z + Math.sin(azimuth) * r],
    look: [center.x, center.y + lookY, center.z],
  };
}

function camAlongAxis(lookTarget, backDist, lift, lookBoost = 0.48) {
  const pos = new THREE.Vector3(
    lookTarget.x - Math.cos(WAVE_ANGLE) * backDist * CAM,
    lookTarget.y + lift * CAM,
    lookTarget.z - Math.sin(WAVE_ANGLE) * backDist * CAM
  );
  return {
    pos: [pos.x, pos.y, pos.z],
    look: [lookTarget.x, lookTarget.y + lookBoost, lookTarget.z],
  };
}

/**
 * 0.00–0.07 assemble orbit
 * 0.07–0.19 terminal + auger
 * 0.19–0.33 wave pullback
 * 0.33–0.40 approach truck
 * 0.40–0.46 fly past truck → beyond
 * 0.46–0.51 card + press
 * 0.51–0.55 turn to combine (truck fades)
 * 0.55–0.64 fly back
 * 0.64–0.88 accepted → unlock → unload
 * 0.88–0.94 camera pullback
 * 0.93–1.00 models scatter
 */
function sampleCam(p) {
  const t = clamp(p, 0, 1);
  if (t < 0.07) {
    const u = smooth(t / 0.07);
    return orbitPose(COMBINE, lerp(11, 8.5, u), lerp(3.1, 2.85, u), lerp(-0.6, 0.15, u), 0.78);
  }
  if (t < 0.13) {
    const u = smooth(range(t, 0.07, 0.13));
    return orbitPose(COMBINE, lerp(8.5, 7.4, u), lerp(2.85, 2.55, u), lerp(0.15, 1.85, u), lerp(0.78, 0.88, u));
  }
  if (t < 0.19) {
    const u = smooth(range(t, 0.13, 0.19));
    return orbitPose(COMBINE, lerp(7.4, 6.9, u), lerp(2.55, 2.35, u), lerp(1.85, 3.75, u), lerp(0.88, 0.98, u));
  }
  if (t < 0.33) {
    const waveU = smooth(range(t, 0.19, 0.32));
    const u = smooth(range(t, 0.19, 0.33));
    return orbitPose(
      COMBINE,
      lerp(6.9, 12.5, waveU),
      lerp(2.35, 5.2, waveU),
      lerp(3.75, 2.85, u),
      0.72
    );
  }
  if (t < 0.4) {
    const u = smooth(range(t, 0.33, 0.4));
    const from = orbitPose(COMBINE, 12.5, 5.2, 2.85, 0.72);
    const toPos = [
      lerp(COMBINE.x, TRUCK_FAR.x, 0.55) + 3.2,
      4.1,
      lerp(COMBINE.z, TRUCK_FAR.z, 0.55),
    ];
    const toLook = [TRUCK_FAR.x, TRUCK_FAR.y + 0.45, TRUCK_FAR.z];
    return { pos: lerp3(from.pos, toPos, u), look: lerp3(from.look, toLook, u) };
  }
  if (t < 0.46) {
    const u = smooth(range(t, 0.4, 0.46));
    const fromPos = [
      lerp(COMBINE.x, TRUCK_FAR.x, 0.55) + 3.2,
      4.1,
      lerp(COMBINE.z, TRUCK_FAR.z, 0.55),
    ];
    const fromLook = [TRUCK_FAR.x, TRUCK_FAR.y + 0.45, TRUCK_FAR.z];
    return {
      pos: lerp3(fromPos, TRUCK_BEYOND.toArray(), u),
      look: lerp3(fromLook, [TRUCK_FAR.x, TRUCK_FAR.y + 0.55, TRUCK_FAR.z], u),
    };
  }
  if (t < 0.51) {
    return {
      pos: TRUCK_BEYOND.toArray(),
      look: [TRUCK_FAR.x, TRUCK_FAR.y + 0.55, TRUCK_FAR.z],
    };
  }
  if (t < 0.55) {
    const u = smooth(range(t, 0.51, 0.55));
    const lookCombine = [COMBINE.x, COMBINE.y + 0.7, COMBINE.z];
    return {
      pos: TRUCK_BEYOND.toArray(),
      look: lerp3([TRUCK_FAR.x, TRUCK_FAR.y + 0.55, TRUCK_FAR.z], lookCombine, u),
    };
  }
  if (t < 0.64) {
    const u = smooth(range(t, 0.55, 0.64));
    const arrive = orbitPose(COMBINE, 8.6, 3.35, 1.35, 0.82);
    return {
      pos: lerp3(TRUCK_BEYOND.toArray(), arrive.pos, u),
      look: lerp3([COMBINE.x, COMBINE.y + 0.7, COMBINE.z], arrive.look, u),
    };
  }
  if (t < 0.88) {
    const u = smooth(range(t, 0.64, 0.88));
    const unloadMid = COMBINE.clone().lerp(TRUCK_NEAR, 0.42);
    return orbitPose(
      COMBINE.clone().lerp(unloadMid, smooth(range(t, 0.78, 0.86))),
      lerp(8.6, 8.4, u),
      lerp(3.35, 3.25, u),
      lerp(1.35, 1.22, u),
      0.82
    );
  }
  if (t < 0.94) {
    const u = smooth(range(t, 0.88, 0.94));
    return {
      pos: lerp3([-5.3, 7, 12], [-5.3, 9.8, 18], u),
      look: [-5.35, 0.35, 0],
    };
  }
  const u = smooth(range(t, 0.94, 1));
  return {
    pos: lerp3([-5.3, 9.8, 18], [-5.5, 12.5, 24], u),
    look: [-5.35, 0.15, 0],
  };
}

/** Soft mask: folded unload spout along rear (+X, −Z), including downturn tip */
function markFoldedAuger(positions) {
  const n = positions.length / 3;
  const out = new Float32Array(n);
  // folded rear tube + downturn tip (local combine space)
  const ax = 0.4;
  const ay = 0.48;
  const az = -0.5;
  const bx = 0.43;
  const by = 0.5;
  const bz = -2.0;
  const cx = 0.42;
  const cy = 0.22;
  const cz = -2.38;
  const dx = 0.4;
  const dy = 0.1;
  const dz = -2.48;
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const ab2 = abx * abx + aby * aby + abz * abz;
  const bcx = cx - bx;
  const bcy = cy - by;
  const bcz = cz - bz;
  const bc2 = bcx * bcx + bcy * bcy + bcz * bcz;
  const cdx = dx - cx;
  const cdy = dy - cy;
  const cdz = dz - cz;
  const cd2 = cdx * cdx + cdy * cdy + cdz * cdz;

  const distSeg = (px, py, pz, ox, oy, oz, sx, sy, sz, len2) => {
    let t = ((px - ox) * sx + (py - oy) * sy + (pz - oz) * sz) / len2;
    t = clamp(t, 0, 1);
    const qx = px - (ox + sx * t);
    const qy = py - (oy + sy * t);
    const qz = pz - (oz + sz * t);
    return Math.sqrt(qx * qx + qy * qy + qz * qz);
  };

  for (let i = 0; i < n; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    // keep mask to rear-right tube volume only
    if (x < 0.18 || x > 0.78 || y < -0.25 || y > 0.78 || z > -0.28) {
      out[i] = 0;
      continue;
    }
    const dMain = distSeg(x, y, z, ax, ay, az, abx, aby, abz, ab2);
    const dTip = distSeg(x, y, z, bx, by, bz, bcx, bcy, bcz, bc2);
    const dEnd = distSeg(x, y, z, cx, cy, cz, cdx, cdy, cdz, cd2);
    let dist = Math.min(dMain, dTip, dEnd);
    // wide nozzle / spout blob (particles sit off the thin tube axis)
    if (z < -1.75 && x > 0.22 && x < 0.68 && y < 0.68) {
      const nx = x - 0.42;
      const ny = y - 0.34;
      const nz = z + 2.28;
      dist = Math.min(dist, Math.sqrt(nx * nx + ny * ny * 0.7 + nz * nz) - 0.1);
    }
    if (z < -2.05 && x > 0.25 && x < 0.6 && y < 0.45) {
      const nx = x - 0.41;
      const ny = y - 0.18;
      const nz = z + 2.4;
      dist = Math.min(dist, Math.sqrt(nx * nx * 0.9 + ny * ny + nz * nz) - 0.08);
    }
    // lower downturn + stray tip crumbs under the spout
    if (z < -1.5 && x > 0.18 && x < 0.72 && y < 0.35) {
      const nx = x - 0.36;
      const ny = y - 0.05;
      const nz = z + 1.85;
      dist = Math.min(dist, Math.sqrt(nx * nx + ny * ny * 1.1 + nz * nz) - 0.14);
    }
    const soft = z < -1.55 ? 0.28 : 0.11;
    out[i] = clamp(1 - (dist - 0.05) / soft, 0, 1);
  }
  return out;
}

function densify(arr, mult = 1.5) {
  if (mult <= 1.01) return arr;
  const n = arr.length / 3;
  const keep = Math.floor(n * mult);
  const out = new Float32Array(keep * 3);
  for (let i = 0; i < keep; i++) {
    const j = Math.floor((i / keep) * n);
    const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    const r = h - Math.floor(h);
    const r2 = Math.sin(h) - Math.floor(Math.sin(h));
    const r3 = Math.cos(h * 0.17) - Math.floor(Math.cos(h * 0.17));
    out[i * 3] = arr[j * 3] + (r - 0.5) * 0.012;
    out[i * 3 + 1] = arr[j * 3 + 1] + (r2 - 0.5) * 0.012;
    out[i * 3 + 2] = arr[j * 3 + 2] + (r3 - 0.5) * 0.012;
  }
  return out;
}

function downsample(arr, factor) {
  if (factor >= 0.98) return densify(arr, 1.5);
  const n = arr.length / 3;
  const keep = Math.max(1800, Math.floor(n * factor));
  const out = new Float32Array(keep * 3);
  const step = n / keep;
  for (let i = 0; i < keep; i++) {
    const j = Math.floor(i * step) * 3;
    out[i * 3] = arr[j];
    out[i * 3 + 1] = arr[j + 1];
    out[i * 3 + 2] = arr[j + 2];
  }
  return densify(out, 1.25);
}

function scatterFromWave(positions, spread) {
  const n = positions.length / 3;
  const s = new Float32Array(n * 3);
  const dx = COMBINE.x - TRUCK_FAR.x;
  const dz = COMBINE.z - TRUCK_FAR.z;
  const len = Math.hypot(dx, dz) || 1;
  for (let i = 0; i < n; i++) {
    const along = 0.45 + Math.random() * 0.65;
    const ang = Math.random() * Math.PI * 2;
    const rad = spread * (0.2 + Math.random() * 0.8);
    const wx = COMBINE.x - (dx / len) * len * along + Math.cos(ang) * rad;
    const wy = COMBINE.y + (Math.random() - 0.5) * spread * 0.12;
    const wz = COMBINE.z - (dz / len) * len * along + Math.sin(ang) * rad;
    s[i * 3] = wx - TRUCK_FAR.x;
    s[i * 3 + 1] = wy - TRUCK_FAR.y;
    s[i * 3 + 2] = wz - TRUCK_FAR.z;
  }
  return s;
}

function scatterFrom(positions, radius, biasDir = null) {
  const n = positions.length / 3;
  const s = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (biasDir) {
      const spread = radius * (0.35 + Math.random() * 0.65);
      const jx = (Math.random() - 0.5) * radius * 0.55;
      const jy = (Math.random() - 0.5) * radius * 0.35;
      const jz = (Math.random() - 0.5) * radius * 0.55;
      s[i * 3] = biasDir.x * spread + jx;
      s[i * 3 + 1] = biasDir.y * spread + jy;
      s[i * 3 + 2] = biasDir.z * spread + jz;
      continue;
    }
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * Math.cbrt(Math.random());
    s[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    s[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    s[i * 3 + 2] = r * Math.cos(phi);
  }
  return s;
}

function seeds(n) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = Math.random();
  return a;
}

function clusterPoints(n, radius) {
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());
    pts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pts[i * 3 + 2] = r * Math.cos(phi);
  }
  return pts;
}

/** Straight unload spout: up ~20° toward truck bed */
function buildAugerPipePoints() {
  const pts = [];
  const pushV = (v) => pts.push(v.x, v.y, v.z);
  const tmp = new THREE.Vector3();
  const t1 = new THREE.Vector3();
  const t2 = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const alt = new THREE.Vector3(1, 0, 0);

  const ring = (center, dir, radius, segs) => {
    nrm.copy(dir).normalize();
    const ref = Math.abs(nrm.y) < 0.85 ? up : alt;
    t1.crossVectors(nrm, ref).normalize();
    t2.crossVectors(nrm, t1).normalize();
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      tmp.copy(center).addScaledVector(t1, Math.cos(a) * radius).addScaledVector(t2, Math.sin(a) * radius);
      pushV(tmp);
    }
  };

  const tube = (from, to, radius, rings, segs) => {
    nrm.copy(to).sub(from);
    const len = nrm.length();
    nrm.multiplyScalar(1 / len);
    for (let i = 0; i <= rings; i++) {
      tmp.copy(from).addScaledVector(nrm, (i / rings) * len);
      ring(tmp.clone(), nrm, radius, segs);
    }
  };

  const mount = AUGER_MOUNT.clone();
  const tip = PIPE_TIP_LOCAL.clone();
  tube(mount, tip, 0.09, 56, 18);
  ring(tip, new THREE.Vector3(0.1, -1, 0.02).normalize(), 0.068, 14);
  return new Float32Array(pts);
}

function augerTipWorld() {
  return combineLocalToWorld(PIPE_TIP_LOCAL);
}

function truckBedWorld() {
  return TRUCK_NEAR.clone().add(new THREE.Vector3(0.12, 0.32, 0));
}

function makeDot() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const vehicleVert = /* glsl */ `
attribute float aSeed;
attribute float aAuger;
attribute vec3 aScatter;
uniform float uReveal;
uniform float uAuger;
uniform float uTime;
uniform vec3 uMouse;
uniform float uSize;
uniform float uMouseStr;
varying float vAlpha;
void main() {
  float appear = smoothstep(aSeed * 0.22, aSeed * 0.22 + 0.78, uReveal);
  vec3 p = mix(aScatter, position, appear);
  vec3 to = p - uMouse;
  float d = length(to);
  p += normalize(to + vec3(0.0001)) * uMouseStr * exp(-d * d * 1.7);
  float tw = 0.78 + 0.22 * sin(uTime * (1.3 + aSeed * 2.8) + aSeed * 36.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(uSize * tw * (55.0 / max(1.2, -mv.z)), 0.55, 3.6);
  gl_Position = projectionMatrix * mv;
  vAlpha = appear * tw;
}
`;

/** Technique — shrink + dim hard when far (additive mustn't burn green) */
const techVert = /* glsl */ `
attribute float aSeed;
attribute float aAuger;
attribute vec3 aScatter;
uniform float uReveal;
uniform float uAuger;
uniform float uDissolve;
uniform float uTime;
uniform vec3 uMouse;
uniform float uSize;
uniform float uMouseStr;
varying float vAlpha;
varying float vFar;
void main() {
  float appear = smoothstep(aSeed * 0.22, aSeed * 0.22 + 0.78, uReveal);
  float hide = aAuger * uAuger;
  appear *= 1.0 - hide;
  // assemble uses aScatter only; explode only on end dissolve
  vec3 p = mix(aScatter, position, appear);
  p = mix(p, aScatter, hide);

  float diss = smoothstep(aSeed * 0.18, aSeed * 0.18 + 0.82, uDissolve);
  vec3 away = normalize(position + vec3(0.002, 0.35, 0.002));
  vec3 explode = position + away * (12.0 + aSeed * 26.0) + vec3(
    (aSeed - 0.5) * 18.0,
    4.0 + aSeed * 14.0,
    (fract(aSeed * 17.0) - 0.5) * 18.0
  );
  p = mix(p, explode, diss);

  vec3 to = p - uMouse;
  float d = length(to);
  p += normalize(to + vec3(0.0001)) * uMouseStr * exp(-d * d * 1.7) * (1.0 - diss);
  float tw = 0.9 + 0.1 * sin(uTime * (0.9 + aSeed * 1.6) + aSeed * 20.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float z = max(2.5, -mv.z);
  float distScale = 20.0 / pow(z, 1.26);
  float farAmt = smoothstep(9.0, 38.0, z);
  float keep = step(farAmt * 0.65, aSeed);
  gl_PointSize = clamp(uSize * tw * distScale * (1.0 - hide) * keep * (1.0 - diss * 0.4), 0.0, 3.4);
  gl_Position = projectionMatrix * mv;
  float nearBoost = mix(0.96, 0.6, farAmt);
  vAlpha = appear * tw * nearBoost * keep * (1.0 - diss);
  vFar = farAmt;
}
`;

const pipeVert = /* glsl */ `
attribute float aSeed;
attribute float aSeg;
attribute vec3 aScatter;
uniform float uReveal;
uniform float uDeploy;
uniform float uDissolve;
uniform float uTime;
uniform float uSize;
varying float vAlpha;
varying float vFar;
void main() {
  float seg = smoothstep(aSeg - 0.08, aSeg + 0.04, uDeploy);
  float appear = smoothstep(aSeed * 0.12, aSeed * 0.12 + 0.65, uReveal) * seg;
  vec3 p = mix(aScatter, position, appear);

  float diss = smoothstep(aSeed * 0.15, aSeed * 0.15 + 0.85, uDissolve);
  vec3 away = normalize(position + vec3(0.002, 0.25, 0.002));
  vec3 explode = position + away * (10.0 + aSeed * 22.0) + vec3(
    (aSeed - 0.5) * 14.0,
    3.5 + aSeed * 12.0,
    (fract(aSeed * 13.0) - 0.5) * 14.0
  );
  p = mix(p, explode, diss);

  float tw = 0.9 + 0.1 * sin(uTime * 1.6 + aSeed * 30.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float z = max(2.5, -mv.z);
  float distScale = 18.5 / pow(z, 1.24);
  float farAmt = smoothstep(9.0, 36.0, z);
  float keep = step(farAmt * 0.5, aSeed);
  gl_PointSize = clamp(uSize * tw * distScale * keep * (1.0 - diss * 0.3), 0.0, 3.2);
  gl_Position = projectionMatrix * mv;
  float nearBoost = mix(0.96, 0.62, farAmt);
  vAlpha = appear * tw * nearBoost * keep * (1.0 - diss);
  vFar = farAmt;
}
`;

const vehicleFrag = /* glsl */ `
uniform vec3 uColor;
uniform sampler2D uMap;
varying float vAlpha;
varying float vFar;
void main() {
  if (vAlpha < 0.02) discard;
  vec4 m = texture2D(uMap, gl_PointCoord);
  float a = m.a * vAlpha * mix(0.66, 0.38, vFar);
  if (a < 0.03) discard;
  vec3 col = mix(uColor, uColor * 0.82, vFar);
  gl_FragColor = vec4(col, a);
}
`;

/** Slow rising particles — gray + green; pulse wave every ~5s */
const ambientVert = /* glsl */ `
attribute float aSeed;
attribute float aTint;
attribute float aSpeed;
attribute float aCeil;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uPulse; // 0..1 expanding ring phase
uniform vec3 uMouse;
uniform float uMouseStr;
varying float vAlpha;
varying float vTint;
varying float vPulseBoost;
void main() {
  float life = fract(aSeed + uTime * aSpeed);
  vec3 p = position;
  float ground = -0.06;
  p.y = ground + 0.02 + life * aCeil;
  p.x += sin(uTime * 0.1 + aSeed * 20.0) * 0.05 * life;
  p.z += cos(uTime * 0.09 + aSeed * 17.0) * 0.05 * life;

  // soft cursor wake
  vec2 away = p.xz - uMouse.xz;
  float md = length(away);
  float push = uMouseStr * exp(-md * md * 0.55);
  p.xz += normalize(away + vec2(0.0001)) * push;
  p.y += push * 0.2;

  float r = length(p.xz);
  float ringR = uPulse * 58.0;
  float ring = abs(r - ringR);
  float live = smoothstep(0.0, 0.05, uPulse) * (1.0 - smoothstep(0.88, 1.0, uPulse));
  vPulseBoost = exp(-ring * ring * 0.1) * live;
  vPulseBoost += exp(-md * md * 0.7) * 0.12;

  float fadeIn = smoothstep(0.0, 0.06, life);
  float fadeOut = 1.0 - smoothstep(0.78, 1.0, life);
  float tw = 0.85 + 0.15 * sin(uTime * 0.6 + aSeed * 12.0);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float z = max(1.5, -mv.z);
  gl_PointSize = clamp(uSize * tw * uPixelRatio * (70.0 / z), 0.6, 3.2);
  gl_Position = projectionMatrix * mv;
  vTint = aTint;
  vAlpha = fadeIn * fadeOut * tw * (0.35 + 0.5 * mix(0.5, 1.0, aTint));
}
`;

const ambientFrag = /* glsl */ `
uniform vec3 uGreen;
uniform vec3 uGray;
uniform sampler2D uMap;
varying float vAlpha;
varying float vTint;
varying float vPulseBoost;
void main() {
  vec4 m = texture2D(uMap, gl_PointCoord);
  float a = m.a * (vAlpha + vPulseBoost * 0.55);
  if (a < 0.025) discard;
  vec3 col = mix(uGray, uGreen, vTint);
  col += vec3(0.55, 1.0, 0.6) * vPulseBoost;
  gl_FragColor = vec4(col * (0.6 + 0.7 * m.r), a);
}
`;

/** Dark velvet floor + water-like green caustics (просветы) */
const velvetVert = /* glsl */ `
varying vec2 vXZ;
void main() {
  vec3 p = position;
  // flat cloth — fixed height so vehicles sit on it
  vXZ = p.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const velvetFrag = /* glsl */ `
uniform float uTime;
varying vec2 vXZ;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise21(p);
    p = p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  float dist = length(vXZ);
  // wide soft falloff — blend into sky haze, not into black
  float fade = 1.0 - smoothstep(24.0, 64.0, dist);

  float n0 = fbm(vXZ * 0.08);
  float n1 = fbm(vXZ * 0.17 + vec2(4.1, 2.3));
  vec3 baseA = vec3(0.028, 0.042, 0.032);
  vec3 baseB = vec3(0.04, 0.058, 0.042);
  vec3 baseC = vec3(0.024, 0.05, 0.036);
  vec3 base = mix(baseA, baseB, n0);
  base = mix(base, baseC, n1 * 0.5);

  float t = uTime * 0.48;
  vec2 uv = vXZ * 0.145;
  vec2 w1 = vec2(fbm(uv + t * 0.14), fbm(uv + vec2(5.2, 1.3) - t * 0.11));
  vec2 w2 = vec2(fbm(uv * 1.6 + w1 * 1.35 + t * 0.09), fbm(uv * 1.5 - w1 + vec2(2.8, 7.1)));
  float c = fbm(uv * 2.6 + w2 * 1.55 + t * 0.08);
  float c2 = fbm(uv * 4.8 - w2 * 1.05 - t * 0.09 + 3.7);
  float fill = fbm(uv * 0.55 + t * 0.06);

  float caustic = smoothstep(0.24, 0.7, c);
  caustic *= mix(0.55, 1.1, smoothstep(0.2, 0.6, c2));
  caustic = mix(caustic * 0.55, caustic, smoothstep(0.3, 0.7, fill));

  float glow = max(caustic, fill * 0.38);
  float hot = pow(smoothstep(0.38, 0.9, caustic), 1.25);

  vec3 lime = vec3(0.32, 0.62, 0.26);
  vec3 mint = vec3(0.11, 0.3, 0.16);
  vec3 col = base + mint * glow * 0.38 + lime * hot * 0.2;
  col += mint * fill * 0.14;

  // same haze as sky horizon — kills the hard rim
  vec3 skyHaze = vec3(0.055, 0.105, 0.068);
  col = mix(skyHaze, col, fade);

  gl_FragColor = vec4(col, 1.0);
}
`;

const techFrag = /* glsl */ `
uniform vec3 uColor;
uniform sampler2D uMap;
varying float vAlpha;
varying float vFar;
void main() {
  if (vAlpha < 0.02) discard;
  vec4 m = texture2D(uMap, gl_PointCoord);
  float a = m.a * vAlpha * mix(0.64, 0.34, vFar);
  if (a < 0.03) discard;
  vec3 col = mix(uColor, uColor * 0.78, vFar);
  gl_FragColor = vec4(col, a);
}
`;

function VehicleCloud({ positions, color, reveal, size = 2.6, scatterR = 5.2, waveScatter = false, mouse, augerHide = null, maskAuger = false, dissolve = null }) {
  const mat = useRef();
  const geo = useMemo(() => {
    const n = positions.length / 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute(
      "aScatter",
      new THREE.BufferAttribute(waveScatter ? scatterFromWave(positions, scatterR) : scatterFrom(positions, scatterR), 3)
    );
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds(n), 1));
    g.setAttribute("aAuger", new THREE.BufferAttribute(maskAuger ? markFoldedAuger(positions) : new Float32Array(n), 1));
    return g;
  }, [positions, scatterR, waveScatter, maskAuger]);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uReveal: { value: 0 },
      uAuger: { value: 0 },
      uDissolve: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 99) },
      uSize: { value: size },
      uMouseStr: { value: 0.1 },
      uColor: { value: color },
      uMap: { value: map },
    }),
    [color, map, size]
  );
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uReveal.value = reveal.current;
    mat.current.uniforms.uAuger.value = augerHide ? augerHide.current : 0;
    mat.current.uniforms.uDissolve.value = dissolve ? dissolve.current : 0;
    mat.current.uniforms.uMouse.value.copy(mouse.current);
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={techVert}
        fragmentShader={techFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function AugerPipe({ reveal, deploy, mouse, dissolve = null }) {
  const mat = useRef();
  const positions = useMemo(() => buildAugerPipePoints(), []);
  const geo = useMemo(() => {
    const n = positions.length / 3;
    const seg = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = positions[i * 3];
      seg[i] = clamp((x - AUGER_MOUNT.x) / (PIPE_TIP_LOCAL.x - AUGER_MOUNT.x), 0, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatterFrom(positions, 1.8), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds(n), 1));
    g.setAttribute("aSeg", new THREE.BufferAttribute(seg, 1));
    return g;
  }, [positions]);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uReveal: { value: 0 },
      uDeploy: { value: 0 },
      uDissolve: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 2.85 },
      uColor: { value: BRAND2 },
      uMap: { value: map },
    }),
    [map]
  );
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uReveal.value = reveal.current;
    mat.current.uniforms.uDeploy.value = deploy.current;
    mat.current.uniforms.uDissolve.value = dissolve ? dissolve.current : 0;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={pipeVert}
        fragmentShader={vehicleFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function MarkerCluster({
  local,
  color,
  visible,
  radius = 0.055,
  count = 260,
  size = 0.048,
  blending = THREE.AdditiveBlending,
  opacityMul = 0.92,
}) {
  const ref = useRef();
  const mat = useRef();
  const positions = useMemo(() => clusterPoints(count, radius), [count, radius]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  const map = useMemo(() => makeDot(), []);
  useFrame(() => {
    if (!ref.current || !mat.current) return;
    const v = visible.current;
    ref.current.visible = v > 0.02;
    mat.current.opacity = v * opacityMul;
    mat.current.size = size;
  });
  return (
    <group position={local.toArray()}>
      <points ref={ref} geometry={geo} frustumCulled={false}>
        <pointsMaterial
          ref={mat}
          map={map}
          color={color}
          size={size}
          transparent
          depthWrite={false}
          blending={blending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function CalloutStick({ fromRef, toRef, visibleRef }) {
  const ref = useRef();
  const slots = 42;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(slots * 3), 3));
    return g;
  }, []);
  const map = useMemo(() => makeDot(), []);
  useFrame(() => {
    if (!ref.current) return;
    const v = visibleRef.current;
    const grow = smooth(clamp(v, 0, 1));
    ref.current.visible = v > 0.02;
    ref.current.material.opacity = v * 0.92;
    ref.current.material.size = 0.032;
    const from = fromRef.current;
    const to = toRef.current;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < slots; i++) {
      const t = (i / (slots - 1)) * grow;
      arr[i * 3] = lerp(from.x, to.x, t);
      arr[i * 3 + 1] = lerp(from.y, to.y, t);
      arr[i * 3 + 2] = lerp(from.z, to.z, t);
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={map}
        color="#b8c0ba"
        size={0.032}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

function Callout({ local, labelOffset, visibleRef, children }) {
  const tag = useRef();
  const labelGrp = useRef();
  const anchor = useRef(new THREE.Vector3());
  const label = useRef(new THREE.Vector3());
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame(() => {
    const v = visibleRef.current;
    anchor.current.copy(local);
    anchor.current.applyAxisAngle(yAxis, COMBINE_YAW);
    anchor.current.add(COMBINE);
    label.current.copy(anchor.current).add(labelOffset);
    if (labelGrp.current) labelGrp.current.position.copy(label.current);
    if (tag.current) tag.current.style.opacity = String(v);
  });
  return (
    <>
      <CalloutStick fromRef={anchor} toRef={label} visibleRef={visibleRef} />
      <group ref={labelGrp}>
        <Html center transform={false} style={{ pointerEvents: "none" }}>
          <div className="story-float-tag" ref={tag}>
            {children}
          </div>
        </Html>
      </group>
    </>
  );
}

function StoryCard({ anchor, offset, visibleRef, title, subtitle, action, pressedRef, showTapRing = false }) {
  const grp = useRef();
  const wrap = useRef();
  const btn = useRef();
  const actionWrap = useRef();
  const pos = useRef(new THREE.Vector3());
  const toCam = useMemo(() => new THREE.Vector3(), []);
  const tapAt = useRef(null);
  const tapDone = useRef(false);
  useFrame(({ camera, clock }) => {
    const v = visibleRef.current;
    pos.current.copy(anchor).add(offset);
    toCam.copy(camera.position).sub(pos.current);
    if (toCam.lengthSq() > 0.0001) {
      toCam.normalize();
      pos.current.addScaledVector(toCam, showTapRing ? 0.45 : 0.75);
    }
    if (grp.current) grp.current.position.copy(pos.current);
    if (wrap.current) wrap.current.style.opacity = String(v);
    const press = pressedRef?.current ?? 0;

    if (v < 0.08) {
      tapAt.current = null;
      tapDone.current = false;
    } else if (showTapRing && v > 0.15 && press < 0.05 && !tapDone.current) {
      if (tapAt.current === null) tapAt.current = clock.elapsedTime;
      if (clock.elapsedTime - tapAt.current > 0.65) tapDone.current = true;
    }

    const autoTap = showTapRing && v > 0.15 && press < 0.05 && !tapDone.current && tapAt.current !== null;
    const tapT = autoTap ? clamp((clock.elapsedTime - tapAt.current) / 0.55, 0, 1) : 0;
    const tapEase = autoTap ? smooth(tapT) : 0;
    const scrollEase = press > 0.05 ? smooth(press) : 0;
    const pressAmt = Math.max(tapEase, scrollEase);

    if (actionWrap.current) actionWrap.current.classList.toggle("is-tapping", pressAmt > 0.72);
    if (btn.current) {
      btn.current.classList.toggle("pressed", press > 0.55 || pressAmt > 0.88);
      const scale = press > 0.55 ? 0.86 : lerp(1, 0.84, pressAmt > 0.72 ? (pressAmt - 0.72) / 0.28 : 0);
      btn.current.style.transform = `scale(${scale})`;
    }
  });
  return (
    <group ref={grp}>
      <Html center transform={false} style={{ pointerEvents: "none" }}>
        <div className="story-app-card" ref={wrap}>
          <p className="story-app-brand">Combine Auto</p>
          <p className="story-app-title">{title}</p>
          {subtitle && <p className="story-app-sub">{subtitle}</p>}
          {action && (
            <div className="story-app-action" ref={actionWrap}>
              <span className="story-notify-btn" ref={btn}>
                {action}
              </span>
              {showTapRing && <span className="story-tap-ring" aria-hidden />}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function Shockwave({ origin, progressRef, t0 = 0.19, t1 = 0.32, tFade = 0.38, maxDist = WAVE_DIST }) {
  const ref = useRef();
  const BANDS = 3;
  const PER_BAND = 5200;
  const n = BANDS * PER_BAND;
  const base = useMemo(() => {
    const ang = new Float32Array(n);
    const jit = new Float32Array(n);
    const band = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      ang[i] = Math.random() * Math.PI * 2;
      jit[i] = (Math.random() - 0.5) * 0.22;
      band[i] = i % BANDS;
    }
    return { ang, jit, band };
  }, [n]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  const map = useMemo(() => makeDot(), []);
  const originRef = useMemo(() => origin.clone(), [origin.x, origin.y, origin.z]);
  const bandStep = 0.68;

  useFrame(() => {
    const p = progressRef.current;
    const u = smooth(range(p, t0, t1));
    const fadeOut = 1 - smooth(range(p, t1 - 0.02, tFade));
    const wave = u * fadeOut;
    const front = lerp(0.35, maxDist + 0.2, u);
    const arr = geo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const shell = front - base.band[i] * bandStep;
      const r = Math.max(0.18, shell + base.jit[i] * 0.14);
      const a = base.ang[i];
      arr[i * 3] = originRef.x + Math.cos(a) * r;
      arr[i * 3 + 1] = originRef.y - 0.2 + base.jit[i] * 0.05;
      arr[i * 3 + 2] = originRef.z + Math.sin(a) * r;
    }
    geo.attributes.position.needsUpdate = true;
    if (ref.current) {
      ref.current.visible = wave > 0.015;
      ref.current.material.opacity = wave * 0.82;
    }
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={map}
        color={BRAND2}
        size={0.034}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

function Grain({ progressRef }) {
  const ref = useRef();
  const n = 1600;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aOff", new THREE.BufferAttribute(seeds(n), 1));
    g.setAttribute("aLat", new THREE.BufferAttribute(seeds(n), 1));
    return g;
  }, []);
  const map = useMemo(() => makeDot(), []);
  useFrame(({ clock }) => {
    const p = progressRef.current;
    const flow = smooth(range(p, 0.86, 0.92)) * (1 - smooth(range(p, 0.93, 0.97)));
    const tip = augerTipWorld();
    const bed = truckBedWorld();
    const arr = geo.attributes.position.array;
    const off = geo.attributes.aOff.array;
    const lat = geo.attributes.aLat.array;
    const t = clock.elapsedTime;
    const fall = Math.max(0.35, tip.y - bed.y);
    for (let i = 0; i < n; i++) {
      const cycle = (off[i] + t * 0.34) % 1;
      const u = cycle * flow;
      const spread = (lat[i] - 0.5) * 0.14;
      const side = (lat[(i + 17) % n] - 0.5) * 0.08;
      arr[i * 3] = tip.x + spread * (1 - u * 0.65);
      arr[i * 3 + 1] = tip.y - u * u * fall;
      arr[i * 3 + 2] = tip.z + side * (1 - u * 0.5);
    }
    geo.attributes.position.needsUpdate = true;
    if (ref.current) {
      ref.current.visible = flow > 0.05;
      ref.current.material.opacity = flow * 0.92;
    }
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={map}
        color={WHEAT}
        size={0.042}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        sizeAttenuation
      />
    </points>
  );
}

function heightAt(x, z) {
  return (
    Math.sin(x * 0.055) * 0.045 +
    Math.sin(z * 0.07) * 0.035 +
    Math.sin((x + z) * 0.04) * 0.025 +
    Math.sin(x * 0.12 + z * 0.09) * 0.018
  );
}

/** Shared radial pulse 0..1 — lasts until ring exits the field */
function pulsePhase(t) {
  const cycle = t % 5.2;
  return cycle < 2.6 ? cycle / 2.6 : 0;
}

/** Ground under vehicles (~wheel contact). Clouds centered; bottom ≈ y - 0.84 */
const FIELD_Y = -0.02;

const goldVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uPulse;
uniform vec3 uMouse;
uniform float uMouseStr;
varying float vAlpha;
varying float vPulseBoost;
void main() {
  vec3 p = position;
  vec2 away = p.xz - uMouse.xz;
  float md = length(away);
  float push = uMouseStr * exp(-md * md * 0.48);
  p.xz += normalize(away + vec2(0.0001)) * push;
  p.y += push * 0.12;

  float r = length(p.xz);
  float ringR = uPulse * 58.0;
  float ring = abs(r - ringR);
  // soft exit — no hard cut when the wave leaves the field
  float live = smoothstep(0.0, 0.05, uPulse) * (1.0 - smoothstep(0.88, 1.0, uPulse));
  vPulseBoost = exp(-ring * ring * 0.065) * live;
  vPulseBoost += exp(-md * md * 0.65) * 0.18;

  float tw = 0.85 + 0.15 * sin(uTime * 0.55 + aSeed * 14.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float z = max(1.8, -mv.z);
  float boostSize = 1.0 + vPulseBoost * 1.1;
  gl_PointSize = clamp(uSize * tw * boostSize * uPixelRatio * (85.0 / z), 1.0, 3.6);
  gl_Position = projectionMatrix * mv;
  float fog = 1.0 - smoothstep(24.0, 64.0, r);
  vAlpha = (0.55 + 0.25 * tw + vPulseBoost * 0.95) * fog;
}
`;

const goldFrag = /* glsl */ `
uniform vec3 uGold;
uniform sampler2D uMap;
varying float vAlpha;
varying float vPulseBoost;
void main() {
  vec4 m = texture2D(uMap, gl_PointCoord);
  float a = m.a * vAlpha;
  if (a < 0.03) discard;
  vec3 col = uGold * (0.85 + 0.35 * m.r) + vec3(0.55, 0.35, 0.08) * vPulseBoost;
  gl_FragColor = vec4(col, a);
}
`;

/** Gold dot grid riding subtle relief + same 5s pulse wave */
function GoldGrid({ mouse }) {
  const mat = useRef();
  const { gl } = useThree();
  const geo = useMemo(() => {
    const pts = [];
    const seeds = [];
    const step = 0.95;
    // cover full visible floor fade (matches velvet fog ~58)
    const extent = 56;
    for (let x = -extent; x <= extent; x += step) {
      for (let z = -extent; z <= extent; z += step) {
        const jx = (Math.sin(x * 12.9 + z * 4.1) * 0.5 + 0.5) * 0.2 - 0.1;
        const jz = (Math.sin(z * 9.7 + x * 3.3) * 0.5 + 0.5) * 0.2 - 0.1;
        const px = x + jx;
        const pz = z + jz;
        if (Math.hypot(px, pz) > 57.5) continue;
        const h = heightAt(px, pz);
        const py = FIELD_Y + 0.12 + h * 4.5;
        pts.push(px, py, pz);
        seeds.push(Math.abs(Math.sin(px * 7.1 + pz * 5.3)));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(seeds), 1));
    return g;
  }, []);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 1.15 },
      uPixelRatio: { value: 1 },
      uPulse: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 99) },
      uMouseStr: { value: 0.16 },
      uGold: { value: new THREE.Color("#e8c06a") },
      uMap: { value: map },
    }),
    [map]
  );
  useFrame(({ clock }) => {
    if (!mat.current || !mouse?.current) return;
    const t = clock.elapsedTime;
    mat.current.uniforms.uTime.value = t;
    mat.current.uniforms.uPulse.value = pulsePhase(t);
    mat.current.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);
    mat.current.uniforms.uMouse.value.copy(mouse.current);
  });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={mat}
        vertexShader={goldVert}
        fragmentShader={goldFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        fog={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** Slow rising particles + 5s radial pulse */
function AmbientField({ mouse }) {
  const mat = useRef();
  const { gl } = useThree();
  const geo = useMemo(() => {
    const n = 7500;
    const positions = new Float32Array(n * 3);
    const aSeed = new Float32Array(n);
    const aTint = new Float32Array(n);
    const aSpeed = new Float32Array(n);
    const aCeil = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.7) * 32;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = FIELD_Y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      aSeed[i] = Math.random();
      aTint[i] = Math.random() < 0.48 ? Math.random() * 0.25 : 0.5 + Math.random() * 0.5;
      aSpeed[i] = 0.01 + Math.random() * 0.014;
      aCeil[i] = 4 + Math.random() * 10;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute("aTint", new THREE.BufferAttribute(aTint, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(aSpeed, 1));
    g.setAttribute("aCeil", new THREE.BufferAttribute(aCeil, 1));
    return g;
  }, []);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 0.78 },
      uPixelRatio: { value: 1 },
      uPulse: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 99) },
      uMouseStr: { value: 0.12 },
      uGreen: { value: new THREE.Color("#7ecf8a") },
      uGray: { value: new THREE.Color("#8e959e") },
      uMap: { value: map },
    }),
    [map]
  );
  useFrame(({ clock }) => {
    if (!mat.current || !mouse?.current) return;
    const t = clock.elapsedTime;
    mat.current.uniforms.uTime.value = t;
    mat.current.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);
    mat.current.uniforms.uPulse.value = pulsePhase(t);
    mat.current.uniforms.uMouse.value.copy(mouse.current);
  });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={-1}>
      <shaderMaterial
        ref={mat}
        vertexShader={ambientVert}
        fragmentShader={ambientFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        fog={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** Soft green night sky — follows camera, clearly readable haze */
const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // keep sky at far plane so it never clips
  gl_Position = clip.xyww;
}
`;

const skyFrag = /* glsl */ `
uniform float uTime;
varying vec3 vDir;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise21(p);
    p = p * 2.08 + vec2(1.3, 4.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  // must match velvet skyHaze so the rim disappears
  vec3 groundMatch = vec3(0.055, 0.105, 0.068);
  vec3 horizon = vec3(0.07, 0.13, 0.085);
  vec3 zenith = vec3(0.12, 0.24, 0.15);

  vec3 col = mix(groundMatch, horizon, smoothstep(-0.2, 0.22, h));
  col = mix(col, zenith, smoothstep(0.12, 0.78, h));

  vec2 uv = d.xz * (1.35 / max(0.18, abs(d.y) + 0.4));
  float t = uTime * 0.07;

  float n1 = fbm(uv * 1.15 + vec2(t * 0.75, -t * 0.4));
  float n2 = fbm(uv * 2.5 - vec2(t * 0.4, t * 0.55) + 4.2);
  float n3 = fbm(uv * 0.5 + vec2(-t * 0.22, t * 0.15) + 1.7);
  float clouds = smoothstep(0.28, 0.75, n1 * 0.55 + n2 * 0.45);
  clouds *= mix(0.55, 1.25, n3);

  // detail only well above horizon
  float skyMask = smoothstep(0.12, 0.5, h);

  float streak = fbm(vec2(d.x * 2.0 + t * 0.35, d.z * 0.45 + h * 2.8 - t * 0.28));
  streak = pow(smoothstep(0.4, 0.88, streak), 1.25) * skyMask;

  vec3 mint = vec3(0.14, 0.38, 0.2);
  vec3 lime = vec3(0.22, 0.5, 0.24);
  vec3 teal = vec3(0.1, 0.34, 0.28);
  col += mint * clouds * skyMask * 1.0;
  col += lime * streak * 0.65;
  col += teal * clouds * streak * 0.4;
  col += vec3(0.04, 0.09, 0.055) * smoothstep(0.18, 0.7, h);

  float stars = step(0.988, hash21(floor(d.xy * 130.0))) * smoothstep(0.35, 0.75, h);
  col += vec3(0.4, 0.65, 0.45) * stars * 0.5;

  // wide vertical dissolve into ground haze
  float seam = smoothstep(-0.4, 0.32, h);
  col = mix(groundMatch, col, seam);

  gl_FragColor = vec4(col, 1.0);
}
`;

function SkyDome() {
  const mesh = useRef();
  const mat = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ camera, clock }) => {
    if (mesh.current) mesh.current.position.copy(camera.position);
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-30}>
      <sphereGeometry args={[1, 48, 28]} />
      <shaderMaterial
        ref={mat}
        vertexShader={skyVert}
        fragmentShader={skyFrag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Dark velvet ground with projected light waves */
function FieldMesh() {
  const mat = useRef();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 100, 100);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh geometry={geo} position={[0, FIELD_Y, 0]} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={velvetVert}
        fragmentShader={velvetFrag}
        uniforms={uniforms}
        transparent={false}
        depthWrite={true}
        side={THREE.DoubleSide}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}


function CameraRig({ progressRef }) {
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const tmpT = useRef(new THREE.Vector3());
  const tmpL = useRef(new THREE.Vector3());
  const primed = useRef(false);

  useFrame(({ camera }, dt) => {
    const { pos: tp, look: lk } = sampleCam(progressRef.current);
    tmpT.current.set(tp[0], tp[1], tp[2]);
    tmpL.current.set(lk[0], lk[1], lk[2]);
    if (!primed.current) {
      pos.current.copy(tmpT.current);
      look.current.copy(tmpL.current);
      primed.current = true;
    } else {
      const k = 1 - Math.pow(0.00004, dt);
      pos.current.lerp(tmpT.current, k);
      look.current.lerp(tmpL.current, k);
    }
    const dx = tmpT.current.x - pos.current.x;
    up.current.set(-dx * 0.045, 1, 0).normalize();
    camera.up.copy(up.current);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

function MousePlane({ mouse }) {
  const { camera, pointer } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -FIELD_Y), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    ray.setFromCamera(pointer, camera);
    if (ray.ray.intersectPlane(plane, hit)) mouse.current.lerp(hit, 0.22);
  });
  return null;
}

function useCloud(name, factor) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all([
      fetch(`/particles/${name}.bin`).then((r) => r.arrayBuffer()),
      fetch("/particles/meta.json").then((r) => r.json()),
    ]).then(([bin, meta]) => {
      if (!live) return;
      setData({
        positions: downsample(new Float32Array(bin), factor),
        meta: meta[name],
      });
    });
    return () => {
      live = false;
    };
  }, [name, factor]);
  return data;
}

export default function World({ progressRef }) {
  const factor = typeof window !== "undefined" && window.innerWidth < 820 ? 0.62 : 1;
  const combine = useCloud("combine", factor);
  const truck = useCloud("truck", factor);
  const mouse = useRef(new THREE.Vector3(40, 0, 40));

  const combineReveal = useRef(0);
  const truckFarReveal = useRef(0);
  const truckNearReveal = useRef(0);
  const terminalVis = useRef(0);
  const lockMarkerVis = useRef(0);
  const lockVis = useRef(0);
  const cardSearch = useRef(0);
  const cardRequest = useRef(0);
  const cardAccepted = useRef(0);
  const pressed = useRef(0);
  const tagTerminal = useRef(0);
  const tagLock = useRef(0);
  const tagUnlock = useRef(0);
  const augerReveal = useRef(0);
  const augerDeploy = useRef(0);
  const endDissolve = useRef(0);

  const truckFarGroup = useRef();
  const truckNearGroup = useRef();

  useFrame(() => {
    const p = progressRef.current;

    if (p < 0.06) combineReveal.current = smooth(p / 0.06);
    else combineReveal.current = 1;

    truckFarReveal.current = smooth(range(p, 0.28, 0.4)) * (1 - smooth(range(p, 0.52, 0.56)));
    truckNearReveal.current = smooth(range(p, 0.8, 0.86));

    terminalVis.current = smooth(range(p, 0.08, 0.11)) * (1 - smooth(range(p, 0.12, 0.14)));
    lockMarkerVis.current = smooth(range(p, 0.15, 0.18)) * (1 - smooth(range(p, 0.74, 0.78)));
    lockVis.current = smooth(range(p, 0.15, 0.18)) * (1 - smooth(range(p, 0.19, 0.21)));

    tagTerminal.current = terminalVis.current;
    tagLock.current = lockVis.current;
    tagUnlock.current = smooth(range(p, 0.74, 0.77)) * (1 - smooth(range(p, 0.8, 0.83)));

    cardSearch.current = smooth(range(p, 0.21, 0.24)) * (1 - smooth(range(p, 0.26, 0.29)));
    cardRequest.current = smooth(range(p, 0.45, 0.48)) * (1 - smooth(range(p, 0.52, 0.55)));
    pressed.current = smooth(range(p, 0.48, 0.51));
    cardAccepted.current = smooth(range(p, 0.62, 0.65)) * (1 - smooth(range(p, 0.7, 0.73)));

    augerReveal.current = smooth(range(p, 0.78, 0.83));
    augerDeploy.current =
      smooth(range(p, 0.82, 0.88)) * (0.55 + smooth(range(p, 0.88, 0.92)) * 0.45);

    // end explosion only — does not affect start assemble
    endDissolve.current = smooth(range(p, 0.925, 0.995));

    if (truckFarGroup.current) truckFarGroup.current.visible = truckFarReveal.current > 0.02;
    if (truckNearGroup.current) truckNearGroup.current.visible = truckNearReveal.current > 0.02;
  });

  return (
    <>
      <color attach="background" args={["#0e1b12"]} />
      <fog attach="fog" args={["#0e1b12", 55, 125]} />
      <CameraRig progressRef={progressRef} />
      <MousePlane mouse={mouse} />
      <SkyDome />
      <AmbientField mouse={mouse} />
      <FieldMesh />
      <GoldGrid mouse={mouse} />
      <Shockwave origin={COMBINE} progressRef={progressRef} t0={0.19} t1={0.32} tFade={0.38} />
      <Shockwave origin={TRUCK_FAR} progressRef={progressRef} t0={0.52} t1={0.58} tFade={0.62} maxDist={WAVE_DIST * 0.85} />

      <group position={COMBINE.toArray()} rotation={[0, COMBINE_YAW, 0]}>
        {combine && (
          <VehicleCloud
            positions={combine.positions}
            color={VEHICLE}
            reveal={combineReveal}
            mouse={mouse}
            size={2.35}
            maskAuger
            augerHide={augerReveal}
            dissolve={endDissolve}
          />
        )}
        <MarkerCluster local={TERMINAL_LOCAL} color={NAV} visible={terminalVis} radius={0.06} count={360} size={0.048} />
        <MarkerCluster
          local={AUGER_LOCK_LOCAL}
          color={LOCK}
          visible={lockMarkerVis}
          radius={0.042}
          count={90}
          size={0.052}
          blending={THREE.NormalBlending}
          opacityMul={0.95}
        />
        <AugerPipe reveal={augerReveal} deploy={augerDeploy} mouse={mouse} dissolve={endDissolve} />
      </group>

      <group ref={truckFarGroup} position={TRUCK_FAR.toArray()} rotation={[0, TRUCK_FAR_YAW, 0]}>
        {truck && (
          <VehicleCloud
            positions={truck.positions}
            color={VEHICLE2}
            reveal={truckFarReveal}
            mouse={mouse}
            size={2.45}
            scatterR={8.8}
            waveScatter
          />
        )}
      </group>

      <group ref={truckNearGroup} position={TRUCK_NEAR.toArray()} rotation={[0, TRUCK_NEAR_YAW, 0]}>
        {truck && (
          <VehicleCloud
            positions={truck.positions}
            color={VEHICLE2}
            reveal={truckNearReveal}
            mouse={mouse}
            size={2.4}
            scatterR={3.6}
            dissolve={endDissolve}
          />
        )}
      </group>

      <Callout local={TERMINAL_LOCAL} labelOffset={CALLOUT_TERMINAL} visibleRef={tagTerminal}>
        Терминал Navtelecom
      </Callout>
      <Callout local={AUGER_LOCK_LOCAL} labelOffset={CALLOUT_LOCK} visibleRef={tagLock}>
        Шнек заблокирован
      </Callout>
      <Callout local={AUGER_LOCK_LOCAL} labelOffset={CALLOUT_UNLOCK} visibleRef={tagUnlock}>
        Разблокировано
      </Callout>

      <StoryCard anchor={COMBINE_ANCHOR} offset={new THREE.Vector3(0, 0.4, 0)} visibleRef={cardSearch} title="Поиск перевозчиков" />
      <StoryCard
        anchor={TRUCK_FAR}
        offset={TRUCK_CARD_OFFSET}
        visibleRef={cardRequest}
        title="Комбайн №1 — запрос на выгрузку"
        subtitle="Бункер 70%"
        action="Принять"
        pressedRef={pressed}
        showTapRing
      />
      <StoryCard
        anchor={COMBINE_ANCHOR}
        offset={new THREE.Vector3(0, 0.35, 0.45)}
        visibleRef={cardAccepted}
        title="Запрос принят"
        subtitle="Можно выгружать"
      />

      <Grain progressRef={progressRef} />
    </>
  );
}
