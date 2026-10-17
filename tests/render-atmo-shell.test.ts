/**
 * The atmosphere shell, the gradient sky's limb glow, and the gradient sky's
 * colour (render/scene.ts). The constructor and `update` run against a
 * stand-in renderer with no GL behind it. Under the scattering sky the shell
 * is not drawn: the globe's aerial perspective is its haze there
 * (tests/render-aerial.test.ts). No WebGL pixel claims.
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
  earthMat: THREE.ShaderMaterial;
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

describe('atmosphere shell: the gradient sky\'s limb glow only', () => {
  it('follows the sky: not drawn while the scattering sky draws, whole under the gradient', () => {
    const { sm, my } = build(true);
    const shell = sm.atmoMesh;
    expect(sm.physicalSkyEnabled).toBe(true);
    expect(my.physicalSky!.mesh.visible).toBe(true);
    expect(shell.visible).toBe(false);
    sm.setPhysicalSky(false); // the governor's fallback, `?sky=gradient`
    expect(sm.physicalSkyEnabled).toBe(false);
    expect(my.physicalSky!.mesh.visible).toBe(false);
    expect(shell.visible).toBe(true);
    sm.setPhysicalSky(true);
    expect(shell.visible).toBe(false);
  });

  it('keeps that visibility through `update` at any floating origin and height (the shell\'s 60-110 km band doubled the sky\'s limb)', () => {
    const { sm } = build(true);
    // the floating origins and heights the disc-only cut was replayed at; `update` must not turn the shell
    // back on under the scattering sky, nor off under the gradient (it sets visibility only in setPhysicalSky)
    for (const centre of [[0, 0, 0], [-(R_EARTH + 400e3), 0, 0], [-4.1e6, 3.3e6, -3.9e6]]) {
      for (const alt of [400e3, 2000e3, 35786e3]) {
        for (const physical of [true, false]) {
          sm.setPhysicalSky(physical);
          sm.origin = { x: 0 - centre[0], y: 0 - centre[1], z: 0 - centre[2] };
          sm.camera.position.set(3, -7, 1);
          sm.update({ theta: 0.3, t: 0 } as VisualFrame, { x: 0, y: 1, z: 0 }, alt);
          expect(sm.atmoMesh.visible, `${alt} m, centre ${centre}, physical ${physical}`).toBe(!physical);
          // (+ 0: the group sits at minus the origin, and -0 is not 0 to toEqual)
          expect(sm.earthGroup.position.toArray().map((v) => v + 0)).toEqual(centre);
        }
      }
    }
  });

  it('without float targets there is no scattering sky, and none is reported', () => {
    const { sm, my } = build(false);
    expect(my.physicalSky).toBeNull();
    // it used to start true with no sky to draw, which put the governor on a trial of nothing
    expect(sm.physicalSkyEnabled).toBe(false);
    expect(sm.atmoMesh.visible).toBe(true);
    sm.setPhysicalSky(true);
    expect(sm.physicalSkyEnabled).toBe(false);
    expect(sm.atmoMesh.visible).toBe(true);
  });

  it('the globe is told where the Earth is under the floating origin', () => {
    const { sm, my } = build(true);
    sm.origin = { x: R_EARTH + 400e3, y: -1234.5, z: 2e5 };
    sm.camera.position.set(30, -20, 10);
    sm.update({ theta: 0.3, t: 0 } as VisualFrame, { x: 0, y: 1, z: 0 }, 400e3);
    const c = my.earthMat.uniforms.earthCentre.value as THREE.Vector3;
    expect(c.toArray()).toEqual([-(R_EARTH + 400e3), 1234.5, -2e5]);
    expect((my.earthMat.uniforms.camPos.value as THREE.Vector3).toArray()).toEqual([30, -20, 10]);
    expect((my.atmoMat.uniforms.camPos.value as THREE.Vector3).toArray()).toEqual([30, -20, 10]);
  });

  it('draws whole: the shell shader carries no cut, and its rim follows the ground factor', () => {
    const { sm, my } = build(true);
    const frag = my.atmoMat.fragmentShader;
    expect(frag).not.toContain('discard');
    expect(frag).not.toContain('discOnly');
    for (const line of ['float band = pow(1.0 - d, 3.0);', 'gl_FragColor.a = band * lit * 0.62 * rimGain;']) expect(frag).toContain(line);
    sm.setPhysicalSky(false);
    sm.origin = { x: R_EARTH + 400e3, y: 0, z: 0 };
    sm.camera.position.set(0, 0, 0);
    sm.update({ theta: 0, t: 0 } as VisualFrame, { x: 1, y: 0, z: 0 }, 400e3);
    expect(my.atmoMat.uniforms.rimGain.value).toBe(1);
    expect(my.earthMat.uniforms.rimGain.value).toBe(1);
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
