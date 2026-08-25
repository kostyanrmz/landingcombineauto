"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const BRAND = new THREE.Color("#3dcc4a");
const BRAND2 = new THREE.Color("#7cf08a");
const WHEAT = new THREE.Color("#e8c547");
const STAR = new THREE.Color("#c8ead4");
const WALL = new THREE.Color("#5fd873");
const NAV = new THREE.Color("#4da6ff");
const LOCK = new THREE.Color("#f87171");

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
 * 0.33–0.42 approach truck as it assembles
 * 0.42–0.50 fly past truck → beyond
 * 0.50–0.56 card + press while past truck
 * 0.56–0.62 turn look toward combine (truck fades)
 * 0.62–0.72 fly back to combine
 * 0.72–0.96 unlock → unload panorama
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
  if (t < 0.42) {
    const u = smooth(range(t, 0.33, 0.42));
    const from = orbitPose(COMBINE, 12.5, 5.2, 2.85, 0.72);
    const toPos = [
      lerp(COMBINE.x, TRUCK_FAR.x, 0.55) + 3.2,
      4.1,
      lerp(COMBINE.z, TRUCK_FAR.z, 0.55),
    ];
    const toLook = [TRUCK_FAR.x, TRUCK_FAR.y + 0.45, TRUCK_FAR.z];
    return { pos: lerp3(from.pos, toPos, u), look: lerp3(from.look, toLook, u) };
  }
  if (t < 0.5) {
    const u = smooth(range(t, 0.42, 0.5));
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
  if (t < 0.56) {
    // hold past truck — card + press
    return {
      pos: TRUCK_BEYOND.toArray(),
      look: [TRUCK_FAR.x, TRUCK_FAR.y + 0.55, TRUCK_FAR.z],
    };
  }
  if (t < 0.62) {
    const u = smooth(range(t, 0.56, 0.62));
    const lookCombine = [COMBINE.x, COMBINE.y + 0.7, COMBINE.z];
    return {
      pos: TRUCK_BEYOND.toArray(),
      look: lerp3([TRUCK_FAR.x, TRUCK_FAR.y + 0.55, TRUCK_FAR.z], lookCombine, u),
    };
  }
  if (t < 0.72) {
    const u = smooth(range(t, 0.62, 0.72));
    const arrive = orbitPose(COMBINE, 8.6, 3.35, 1.35, 0.82);
    return {
      pos: lerp3(TRUCK_BEYOND.toArray(), arrive.pos, u),
      look: lerp3([COMBINE.x, COMBINE.y + 0.7, COMBINE.z], arrive.look, u),
    };
  }
  if (t < 0.96) {
    const u = smooth(range(t, 0.72, 0.96));
    const unloadMid = COMBINE.clone().lerp(TRUCK_NEAR, 0.42);
    return orbitPose(
      COMBINE.clone().lerp(unloadMid, smooth(range(t, 0.82, 0.94))),
      lerp(8.6, 8.4, u),
      lerp(3.35, 3.25, u),
      lerp(1.35, 1.22, u),
      lerp(0.82, 0.82, u)
    );
  }
  const u = smooth(range(t, 0.94, 1));
  return {
    pos: lerp3([-5.3, 7, 12], [-5.3, 9.2, 16], u),
    look: [-5.35, 0.35, 0],
  };
}

function downsample(arr, factor) {
  if (factor >= 0.98) return arr;
  const n = arr.length / 3;
  const keep = Math.max(1200, Math.floor(n * factor));
  const out = new Float32Array(keep * 3);
  const step = n / keep;
  for (let i = 0; i < keep; i++) {
    const j = Math.floor(i * step) * 3;
    out[i * 3] = arr[j];
    out[i * 3 + 1] = arr[j + 1];
    out[i * 3 + 2] = arr[j + 2];
  }
  return out;
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
  tube(mount, tip, 0.082, 44, 16);
  ring(tip, new THREE.Vector3(0.1, -1, 0.02).normalize(), 0.062, 12);
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

const pipeVert = /* glsl */ `
attribute float aSeed;
attribute float aSeg;
attribute vec3 aScatter;
uniform float uReveal;
uniform float uDeploy;
uniform float uTime;
uniform float uSize;
varying float vAlpha;
void main() {
  float seg = smoothstep(aSeg - 0.08, aSeg + 0.04, uDeploy);
  float appear = smoothstep(aSeed * 0.15, aSeed * 0.15 + 0.7, uReveal) * seg;
  vec3 p = mix(aScatter, position, appear);
  float tw = 0.82 + 0.18 * sin(uTime * 2.1 + aSeed * 40.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(uSize * tw * (50.0 / max(1.2, -mv.z)), 0.5, 3.2);
  gl_Position = projectionMatrix * mv;
  vAlpha = appear * tw;
}
`;

const vehicleFrag = /* glsl */ `
uniform vec3 uColor;
uniform sampler2D uMap;
varying float vAlpha;
void main() {
  vec4 m = texture2D(uMap, gl_PointCoord);
  float a = m.a * vAlpha * 0.85;
  if (a < 0.06) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

function VehicleCloud({ positions, color, reveal, size = 2.55, scatterR = 5.2, waveScatter = false, mouse }) {
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
    g.setAttribute("aAuger", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, [positions, scatterR, waveScatter]);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uReveal: { value: 0 },
      uAuger: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 99) },
      uSize: { value: size },
      uMouseStr: { value: 0.16 },
      uColor: { value: color },
      uMap: { value: map },
    }),
    [color, map, size]
  );
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uReveal.value = reveal.current;
    mat.current.uniforms.uMouse.value.copy(mouse.current);
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vehicleVert}
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

function AugerPipe({ reveal, deploy, mouse }) {
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
      uTime: { value: 0 },
      uSize: { value: 2.55 },
      uColor: { value: BRAND },
      uMap: { value: map },
    }),
    [map]
  );
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uReveal.value = reveal.current;
    mat.current.uniforms.uDeploy.value = deploy.current;
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

function MarkerCluster({ local, color, visible, radius = 0.055, count = 260, size = 0.048 }) {
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
    mat.current.opacity = v * 0.92;
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
          blending={THREE.AdditiveBlending}
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
        color="#9cffaa"
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
    const flow = smooth(range(p, 0.84, 0.96));
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

function StarDome({ mouse }) {
  const mat = useRef();
  const { positions, seedsArr } = useMemo(() => {
    const n = 18000;
    const positions = new Float32Array(n * 3);
    const seedsArr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const layer = Math.random();
      const r = layer < 0.4 ? 5 + Math.random() * 16 : 18 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 2 + Math.random() * 5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      seedsArr[i] = Math.random();
    }
    return { positions, seedsArr };
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(positions.slice(), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seedsArr, 1));
    g.setAttribute("aAuger", new THREE.BufferAttribute(new Float32Array(positions.length / 3), 1));
    return g;
  }, [positions, seedsArr]);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uReveal: { value: 1 },
      uAuger: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3() },
      uSize: { value: 2.0 },
      uMouseStr: { value: 0.7 },
      uColor: { value: STAR },
      uMap: { value: map },
    }),
    [map]
  );
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uMouse.value.copy(mouse.current);
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vehicleVert}
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

function Ground({ mouse }) {
  const mat = useRef();
  const geo = useMemo(() => {
    const pts = [];
    const push = (x, y, z) => pts.push(x, y, z);
    for (let ix = -130; ix <= 130; ix++) {
      for (let iz = -95; iz <= 95; iz++) {
        const x = ix * 0.2;
        const z = iz * 0.2;
        const y = -1.02 + Math.sin(x * 0.08) * 0.025 + Math.sin(z * 0.11) * 0.02;
        push(x + (Math.random() - 0.5) * 0.04, y, z + (Math.random() - 0.5) * 0.04);
      }
    }
    for (let side of [-1, 1]) {
      for (let iz = -90; iz <= 90; iz++) {
        for (let iy = 0; iy <= 48; iy++) {
          if (Math.random() < 0.3) continue;
          const z = iz * 0.24;
          const y = -0.2 + iy * 0.17;
          const x = side * (12 + y * 0.55 + Math.random() * 0.4);
          push(x, y, z);
        }
      }
    }
    const positions = new Float32Array(pts);
    const n = positions.length / 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(positions.slice(), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds(n), 1));
    g.setAttribute("aAuger", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, []);
  const map = useMemo(() => makeDot(), []);
  const uniforms = useMemo(
    () => ({
      uReveal: { value: 1 },
      uAuger: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3() },
      uSize: { value: 2.4 },
      uMouseStr: { value: 0.4 },
      uColor: { value: WALL },
      uMap: { value: map },
    }),
    [map]
  );
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime * 0.4;
    mat.current.uniforms.uMouse.value.copy(mouse.current);
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vehicleVert}
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
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.15), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    ray.setFromCamera(pointer, camera);
    if (ray.ray.intersectPlane(plane, hit)) mouse.current.lerp(hit, 0.1);
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
  const factor = typeof window !== "undefined" && window.innerWidth < 820 ? 0.42 : 1;
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

  const truckFarGroup = useRef();
  const truckNearGroup = useRef();

  useFrame(() => {
    const p = progressRef.current;

    if (p < 0.06) combineReveal.current = smooth(p / 0.06);
    else combineReveal.current = 1;

    truckFarReveal.current = smooth(range(p, 0.28, 0.4)) * (1 - smooth(range(p, 0.58, 0.62)));
    truckNearReveal.current = smooth(range(p, 0.8, 0.88));

    terminalVis.current = smooth(range(p, 0.08, 0.11)) * (1 - smooth(range(p, 0.12, 0.14)));
    lockMarkerVis.current = smooth(range(p, 0.15, 0.18)) * (1 - smooth(range(p, 0.68, 0.72)));
    lockVis.current = smooth(range(p, 0.15, 0.18)) * (1 - smooth(range(p, 0.19, 0.21)));

    tagTerminal.current = terminalVis.current;
    tagLock.current = lockVis.current;
    tagUnlock.current = smooth(range(p, 0.68, 0.71)) * (1 - smooth(range(p, 0.74, 0.77)));

    cardSearch.current = smooth(range(p, 0.21, 0.24)) * (1 - smooth(range(p, 0.26, 0.29)));
    cardRequest.current = smooth(range(p, 0.49, 0.52)) * (1 - smooth(range(p, 0.57, 0.6)));
    pressed.current = smooth(range(p, 0.52, 0.56));
    cardAccepted.current = smooth(range(p, 0.66, 0.69)) * (1 - smooth(range(p, 0.73, 0.76)));

    augerReveal.current = smooth(range(p, 0.74, 0.78));
    augerDeploy.current = smooth(range(p, 0.78, 0.86)) * (0.55 + smooth(range(p, 0.86, 0.94)) * 0.45);

    if (truckFarGroup.current) truckFarGroup.current.visible = truckFarReveal.current > 0.02;
    if (truckNearGroup.current) truckNearGroup.current.visible = truckNearReveal.current > 0.02;
  });

  return (
    <>
      <color attach="background" args={["#010302"]} />
      <fog attach="fog" args={["#010302", 70, 140]} />
      <CameraRig progressRef={progressRef} />
      <MousePlane mouse={mouse} />
      <StarDome mouse={mouse} />
      <Ground mouse={mouse} />
      <Shockwave origin={COMBINE} progressRef={progressRef} t0={0.19} t1={0.32} tFade={0.38} />
      <Shockwave origin={TRUCK_FAR} progressRef={progressRef} t0={0.58} t1={0.64} tFade={0.68} maxDist={WAVE_DIST * 0.85} />

      <group position={COMBINE.toArray()} rotation={[0, COMBINE_YAW, 0]}>
        {combine && (
          <VehicleCloud
            positions={combine.positions}
            color={BRAND}
            reveal={combineReveal}
            mouse={mouse}
            size={2.55}
          />
        )}
        <MarkerCluster local={TERMINAL_LOCAL} color={NAV} visible={terminalVis} radius={0.06} count={360} size={0.048} />
        <MarkerCluster local={AUGER_LOCK_LOCAL} color={LOCK} visible={lockMarkerVis} radius={0.055} count={340} size={0.046} />
        <AugerPipe reveal={augerReveal} deploy={augerDeploy} mouse={mouse} />
      </group>

      <group ref={truckFarGroup} position={TRUCK_FAR.toArray()} rotation={[0, TRUCK_FAR_YAW, 0]}>
        {truck && (
          <VehicleCloud
            positions={truck.positions}
            color={new THREE.Color("#6ee07a")}
            reveal={truckFarReveal}
            mouse={mouse}
            size={2.35}
            scatterR={8.8}
            waveScatter
          />
        )}
      </group>

      <group ref={truckNearGroup} position={TRUCK_NEAR.toArray()} rotation={[0, TRUCK_NEAR_YAW, 0]}>
        {truck && (
          <VehicleCloud
            positions={truck.positions}
            color={new THREE.Color("#6ee07a")}
            reveal={truckNearReveal}
            mouse={mouse}
            size={2.35}
            scatterR={3.6}
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
