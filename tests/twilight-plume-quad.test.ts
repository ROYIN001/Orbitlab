/**
 * The twilight jellyfish (src/render/twilight-plume.ts) is raymarched on a
 * proxy quad: only the pixels the quad covers run the shader. Seen from
 * outside, the quad must cover the silhouette of the cloud's bounding sphere
 * (BOUND_Z, BOUND_R there: centre 1.0 plume radii behind the nozzle, radius
 * 1.2) — a quad of half-size 1.25 radii at the centre, as first written,
 * cut the dome to straight edges whenever the camera was within ~3.6 radii.
 * From inside, it must fill whatever camera is in use: 34–72° fields of view,
 * phone to ultra-wide, the landing page's view offset. And flying straight
 * up must not break the lighting: the zenith once fell back to a fixed axis
 * within 11.5° of the vertical.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TwilightPlume, jellyfishRadius } from '../src/render/twilight-plume';
import { R_EARTH } from '../src/physics/constants';

const ALT = 110e3;
const R = jellyfishRadius(ALT);
const UP = new THREE.Vector3(1, 0, 0);
// up = +x, east = +y, north = +z: flying east, 20° above the horizontal; the sun 4.6° below the horizon in the north
const DIR = new THREE.Vector3(Math.sin(0.35), Math.cos(0.35), 0);
const SUN = new THREE.Vector3(-0.08, 0, 1).normalize();

function frameFor(dir: THREE.Vector3) {
  const r = UP.clone().multiplyScalar(R_EARTH + ALT);
  return { frame: { altitude: ALT, r: { x: r.x, y: r.y, z: r.z }, thrust: 1e6, t: 100 }, dir: { x: dir.x, y: dir.y, z: dir.z } };
}

function shot(pos: THREE.Vector3, look: THREE.Vector3, fov: number, aspect: number, dir = DIR) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.5, 5e9);
  camera.position.copy(pos);
  camera.up.copy(UP);
  camera.lookAt(look);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const plume = new TwilightPlume();
  const f = frameFor(dir);
  plume.update(f.frame as never, new THREE.Vector3(), f.dir, SUN, -0.1, camera);
  return { camera, plume };
}

/** For a grid of pixels: does the ray meet the sphere (when given), and does it cross the quad beyond the near plane? */
function cast(camera: THREE.PerspectiveCamera, mesh: THREE.Mesh, sphere: { c: THREE.Vector3; r: number } | null, W: number, H: number) {
  mesh.updateMatrixWorld();
  const inv = mesh.matrixWorld.clone().invert();
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const o = camera.position;
  const d = new THREE.Vector3(), p = new THREE.Vector3();
  let missed = 0, inside = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    d.set(((i + 0.5) / W) * 2 - 1, 1 - ((j + 0.5) / H) * 2, 0.5).unproject(camera).sub(o).normalize();
    if (sphere) {
      const oc = o.clone().sub(sphere.c);
      const b = oc.dot(d);
      const h = b * b - oc.lengthSq() + sphere.r * sphere.r;
      if (h <= 0 || -b + Math.sqrt(h) <= 0) continue;
    }
    inside++;
    const t = p.copy(mesh.position).sub(o).dot(n) / d.dot(n);
    p.copy(o).addScaledVector(d, t);
    const depth = p.clone().sub(o).dot(fwd);
    p.applyMatrix4(inv);
    if (!(t > 0 && depth > camera.near && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1)) missed++;
  }
  return { missed, inside };
}

describe('twilight jellyfish proxy quad', () => {
  it('covers the whole bounding sphere from outside it, at every distance and off the centre of the view', () => {
    const c = DIR.clone().multiplyScalar(-1.0 * R);
    const rb = 1.2 * R;
    const side = new THREE.Vector3().crossVectors(DIR, UP).normalize();
    let checked = 0;
    for (const k of [1.12, 1.5, 2.5, 3.5, 8]) for (const az of [0, 1.2, 2.4, 3.1]) for (const off of [0, 0.5]) {
      const v = DIR.clone().multiplyScalar(Math.cos(az)).addScaledVector(side, Math.sin(az)).addScaledVector(UP, 0.3).normalize();
      const { camera, plume } = shot(c.clone().addScaledVector(v, k * rb), c.clone().addScaledVector(side, off * k * rb * 0.4), 48, 16 / 9);
      expect(plume.mesh.visible).toBe(true);
      const r = cast(camera, plume.mesh, { c, r: rb }, 64, 36);
      expect(r.missed, `k=${k} az=${az} off=${off}`).toBe(0);
      checked += r.inside;
    }
    expect(checked).toBeGreaterThan(10_000);
  });

  it('fills every camera from inside the plume', () => {
    const cams: [number, number][] = [[48, 16 / 9], [48, 9 / 19.5], [72, 32 / 9], [72, 9 / 16], [34, 4 / 3], [45, 21 / 9]];
    for (const [fov, aspect] of cams) for (const pos of [new THREE.Vector3(40, 250, 120), new THREE.Vector3(300, -2500, 0)]) {
      const { camera, plume } = shot(pos, new THREE.Vector3(), fov, aspect);
      const r = cast(camera, plume.mesh, null, 48, 27);
      expect(r.missed, `fov=${fov} aspect=${aspect.toFixed(2)}`).toBe(0);
    }
    // the landing page shifts the picture with a view offset
    const { camera } = shot(new THREE.Vector3(40, 250, 120), new THREE.Vector3(), 48, 16 / 9);
    camera.setViewOffset(1600, 900, -0.25 * 1600, -0.1 * 900, 1600, 900);
    camera.updateProjectionMatrix();
    const plume = new TwilightPlume();
    const f = frameFor(DIR);
    plume.update(f.frame as never, new THREE.Vector3(), f.dir, SUN, -0.1, camera);
    expect(cast(camera, plume.mesh, null, 48, 27).missed).toBe(0);
  });

  it('lights by the true zenith and stays finite flying straight up, and hides without a direction', () => {
    for (const dir of [UP, new THREE.Vector3(0.995, 0.0999, 0).normalize(), new THREE.Vector3(0, 0, 1)]) {
      const { plume } = shot(new THREE.Vector3(500, 300, 0), new THREE.Vector3(), 48, 16 / 9, dir);
      const u = (plume.mesh.material as THREE.ShaderMaterial).uniforms;
      expect((u.uUp.value as THREE.Vector3).distanceTo(UP)).toBeLessThan(1e-12);
      for (const k of ['uAxis', 'uSun', 'uUp', 'uVehicle']) expect((u[k].value as THREE.Vector3).toArray().every(Number.isFinite), k).toBe(true);
      expect([...plume.mesh.position.toArray(), ...plume.mesh.quaternion.toArray(), plume.mesh.scale.x].every(Number.isFinite)).toBe(true);
    }
    const { plume } = shot(new THREE.Vector3(500, 300, 0), new THREE.Vector3(), 48, 16 / 9, new THREE.Vector3(0, 0, 0));
    expect(plume.mesh.visible).toBe(false);
  });

  it('gives GLSL smoothstep its edges in order (reversed edges are undefined in GLSL)', () => {
    const src = (new TwilightPlume().mesh.material as THREE.ShaderMaterial).fragmentShader;
    const pairs = [...src.matchAll(/smoothstep\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g)];
    expect(pairs.length).toBeGreaterThan(5);
    for (const [, a, b] of pairs) expect(Number(a)).toBeLessThan(Number(b));
  });
});
