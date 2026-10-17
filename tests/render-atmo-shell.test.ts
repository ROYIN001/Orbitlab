/**
 * The atmosphere shell under the scattering sky, and the gradient sky's
 * colour (render/scene.ts). The constructor and `update` run against a
 * stand-in renderer with no GL behind it; the shell's discard is replayed in
 * float64 and float32 next to the GLSL lines it follows. No WebGL pixel claims.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SceneManager } from '../src/render/scene';
import { R_EARTH } from '../src/physics/constants';
import type { VisualFrame } from '../src/physics/frame';

/** what the GPU offers: half-float targets (and so the scattering sky) or not */
const gpu = vi.hoisted(() => ({ floatTargets: true, setClearColor: undefined as unknown as (...a: unknown[]) => void }));
vi.mock('../src/render/webgl-renderer', () => ({
  createWebGLRenderer: () => ({
    setPixelRatio() {}, getPixelRatio: () => 1, shadowMap: {}, compile() {}, render() {},
    setRenderTarget() {}, getRenderTarget: () => null,
    capabilities: { getMaxAnisotropy: () => 1 },
    extensions: { has: (n: string) => gpu.floatTargets && n === 'EXT_color_buffer_float' },
    getDrawingBufferSize: (v: THREE.Vector2) => v.set(64, 32),
    setClearColor: (...a: unknown[]) => gpu.setClearColor(...a),
  }),
}));

interface Internals {
  atmoMat: THREE.ShaderMaterial;
  physicalSky: { mesh: THREE.Mesh } | null;
  clearColor: THREE.Color;
  composer: { passes: unknown[] };
}

const tex = () => ({ day: new THREE.Texture(), night: new THREE.Texture(), spec: new THREE.Texture(), normal: new THREE.Texture(), clouds: null });
function build(floatTargets: boolean): { sm: SceneManager; my: Internals } {
  gpu.floatTargets = floatTargets;
  const sm = new SceneManager({ addEventListener() {} } as unknown as HTMLCanvasElement, tex());
  return { sm, my: sm as unknown as Internals };
}

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
  // the two canvas painters: there is no 2-D context here, and neither feeds what is tested
  vi.spyOn(SceneManager.prototype as unknown as { drawMarker(): void }, 'drawMarker').mockImplementation(() => {});
  vi.spyOn(SceneManager.prototype as unknown as { updateEnvironment(): void }, 'updateEnvironment').mockImplementation(() => {});
  gpu.setClearColor = vi.fn();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('atmosphere shell: cut to the disc under the scattering sky', () => {
  it('follows the sky: disc only while the scattering sky draws, whole under the gradient', () => {
    const { sm, my } = build(true);
    const u = my.atmoMat.uniforms;
    expect(sm.physicalSkyEnabled).toBe(true);
    expect(my.physicalSky!.mesh.visible).toBe(true);
    expect(u.discOnly.value).toBe(1);
    sm.setPhysicalSky(false); // the governor's fallback, `?sky=gradient`
    expect(sm.physicalSkyEnabled).toBe(false);
    expect(my.physicalSky!.mesh.visible).toBe(false);
    expect(u.discOnly.value).toBe(0);
    sm.setPhysicalSky(true);
    expect(u.discOnly.value).toBe(1);
  });

  it('without float targets there is no scattering sky, and none is reported', () => {
    const { sm, my } = build(false);
    expect(my.physicalSky).toBeNull();
    // it used to start true with no sky to draw, which put the governor on a trial of nothing
    expect(sm.physicalSkyEnabled).toBe(false);
    expect(my.atmoMat.uniforms.discOnly.value).toBe(0);
    sm.setPhysicalSky(true);
    expect(sm.physicalSkyEnabled).toBe(false);
    expect(my.atmoMat.uniforms.discOnly.value).toBe(0);
  });

  it('is told where the Earth is under the floating origin', () => {
    const { sm, my } = build(true);
    sm.origin = { x: R_EARTH + 400e3, y: -1234.5, z: 2e5 };
    sm.camera.position.set(30, -20, 10);
    sm.update({ theta: 0.3, t: 0 } as VisualFrame, { x: 0, y: 1, z: 0 }, 400e3);
    const c = my.atmoMat.uniforms.earthCentre.value as THREE.Vector3;
    expect(c.toArray()).toEqual([-(R_EARTH + 400e3), 1234.5, -2e5]);
    expect((my.atmoMat.uniforms.camPos.value as THREE.Vector3).toArray()).toEqual([30, -20, 10]);
  });
});

/** The discard, as it stands in ATMO_FRAG. */
const SHADER_LINES = [
  'uniform vec3 earthCentre;',
  'uniform float discOnly;',
  'vec3 viewDir = normalize(camPos - vPosW);',
  'if (discOnly > 0.5) {',
  'vec3 cr = cross(camPos - earthCentre, viewDir);',
  `if (dot(cr, cr) > ${(R_EARTH * R_EARTH).toFixed(1)}) discard;`,
];

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => { const n = Math.sqrt(dot(a, a)); return [a[0] / n, a[1] / n, a[2] / n]; };
/** the shader's verdict in float64: true = discarded */
const discarded = (camPos: V, vPosW: V, centre: V): boolean => {
  const cr = cross(sub(camPos, centre), norm(sub(camPos, vPosW)));
  return dot(cr, cr) > R_EARTH * R_EARTH;
};
/** …and op by op in float32, as the GPU runs it (no FMA) */
const f = Math.fround;
const discarded32 = (camPos: V, vPosW: V, centre: V): boolean => {
  const c32 = camPos.map(f) as V, p32 = vPosW.map(f) as V, e32 = centre.map(f) as V;
  const vd = [f(c32[0] - p32[0]), f(c32[1] - p32[1]), f(c32[2] - p32[2])] as V;
  const inv = f(1 / f(Math.sqrt(f(f(f(vd[0] * vd[0]) + f(vd[1] * vd[1])) + f(vd[2] * vd[2])))));
  const d = vd.map((x) => f(x * inv)) as V;
  const o = [f(c32[0] - e32[0]), f(c32[1] - e32[1]), f(c32[2] - e32[2])] as V;
  const cr = [f(f(o[1] * d[2]) - f(o[2] * d[1])), f(f(o[2] * d[0]) - f(o[0] * d[2])), f(f(o[0] * d[1]) - f(o[1] * d[0]))];
  return f(f(f(cr[0] * cr[0]) + f(cr[1] * cr[1])) + f(cr[2] * cr[2])) > f(R_EARTH * R_EARTH);
};

/**
 * A camera at `alt` over the Earth centred at `centre` (the floating origin
 * puts the camera near 0), and the point where the view ray whose perigee is
 * `perigee` m above the surface enters the 110-km shell: a fragment's vPosW.
 */
function scene(alt: number, perigee: number, centre: V): { camPos: V; vPosW: V } {
  const up = norm([0.37, -0.52, 0.769]), side = norm(cross(up, [0, 0, 1]));
  const D = R_EARTH + alt, rp = R_EARTH + perigee, Rs = R_EARTH + 110e3;
  const camPos: V = [centre[0] + up[0] * D + 3, centre[1] + up[1] * D - 7, centre[2] + up[2] * D + 1];
  const o = sub(camPos, centre), r = Math.sqrt(dot(o, o));
  const sa = rp / r, ca = Math.sqrt(1 - sa * sa), oh = norm(o);
  const dir = norm([-ca * oh[0] + sa * side[0], -ca * oh[1] + sa * side[1], -ca * oh[2] + sa * side[2]]);
  const tc = -dot(o, dir), h = Math.sqrt(Rs * Rs - rp * rp);
  return { camPos, vPosW: [camPos[0] + dir[0] * (tc - h), camPos[1] + dir[1] * (tc - h), camPos[2] + dir[2] * (tc - h)] };
}

describe('atmosphere shell: the discard, replayed', () => {
  it('stands in the shell shader as replayed here', () => {
    const frag = build(true).my.atmoMat.fragmentShader;
    for (const line of SHADER_LINES) expect(frag).toContain(line);
  });

  it('drops a ray that clears the Earth and keeps one that meets the disc, at any floating origin', () => {
    for (const centre of [[0, 0, 0], [-(R_EARTH + 400e3), 0, 0], [-4.1e6, 3.3e6, -3.9e6]] as V[]) {
      for (const alt of [400e3, 2000e3, 35786e3]) {
        // the 60-110 km band that doubled the scattering sky's limb, and a ray just over the surface
        for (const p of [100e3, 80e3, 60e3, 5e3, 50]) {
          const { camPos, vPosW } = scene(alt, p, centre);
          expect(discarded(camPos, vPosW, centre)).toBe(true);
          expect(discarded32(camPos, vPosW, centre)).toBe(true);
        }
        // the disc, up to just inside the limb: the shell is its haze there and stays
        for (const p of [-50, -5e3, -100e3, -1000e3]) {
          const { camPos, vPosW } = scene(alt, p, centre);
          expect(discarded(camPos, vPosW, centre)).toBe(false);
          expect(discarded32(camPos, vPosW, centre)).toBe(false);
        }
      }
    }
  });
});

describe('gradient sky: the colour reaches the scene target linear', () => {
  it('is the scene background, cleared by three with the target bound, and never a renderer clear colour', () => {
    const { sm, my } = build(true);
    expect(sm.scene.background).toBe(my.clearColor);
    // a frame drawn before the first `update` (prewarm, no mission yet) clears black, as the renderer's default did
    expect(my.clearColor.getHex()).toBe(0x000000);
    // the background clears inside render(); the pass's own clear would be a second one
    const pass = my.composer.passes[0] as RenderPass;
    expect(pass).toBeInstanceOf(RenderPass);
    expect(pass.clear).toBe(false);
    sm.setPhysicalSky(false);
    sm.origin = { x: R_EARTH + 2, y: 0, z: 0 };
    sm.camera.position.set(0, 0, 0);
    // a night pad: `update` runs with the canvas bound, where three would encode a clear colour to sRGB
    sm.update({ theta: 0, t: 0 } as VisualFrame, { x: -1, y: 0, z: 0 }, 2);
    expect(gpu.setClearColor).not.toHaveBeenCalled();
    expect(sm.scene.background).toBe(my.clearColor);
    const night = my.clearColor.clone();
    expect(night.r + night.g + night.b).toBeGreaterThan(0);
    // …and it follows the sky, in place: noon at the pad is brighter and bluer
    sm.update({ theta: 0, t: 0 } as VisualFrame, { x: 1, y: 0, z: 0 }, 2);
    expect(sm.scene.background).toBe(my.clearColor);
    expect(my.clearColor.b).toBeGreaterThan(night.b * 5);
    expect(gpu.setClearColor).not.toHaveBeenCalled();
  });
});
