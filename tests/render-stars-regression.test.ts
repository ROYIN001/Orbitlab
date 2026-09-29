/** Source-level rendering regressions. No WebGL pixel/appearance claims. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildStarField } from '../src/render/stars';
import { OrbitView } from '../src/render/orbit-view';
import { SceneManager } from '../src/render/scene';

afterEach(() => vi.unstubAllGlobals());

describe('shared Launch/Orbit star field', () => {
  it('keeps Launch stars, renderer and composer on the same capped DPR', () => {
    const stars = buildStarField();
    let ratio = 1;
    const renderer = { getPixelRatio: () => ratio, setPixelRatio: vi.fn((value: number) => { ratio = value; }) };
    const composer = { setPixelRatio: vi.fn() };
    const scene = Object.assign(Object.create(SceneManager.prototype), { renderer, composer, starsMat: stars.material }) as { setPixelRatio(): void };
    for (const [device, expected] of [[3, 2], [1.25, 1.25], [0, 1]]) {
      vi.stubGlobal('window', { devicePixelRatio: device });
      scene.setPixelRatio();
      expect(ratio).toBe(expected);
      expect(composer.setPixelRatio).toHaveBeenLastCalledWith(expected);
      expect(stars.material.uniforms.uPixelRatio.value).toBe(expected);
    }
    scene.setPixelRatio();
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(3);
    expect(composer.setPixelRatio).toHaveBeenCalledTimes(3);
    stars.geometry.dispose(); stars.material.dispose();
  });

  it('is deterministic, finite and on the requested shell at both scene scales', () => {
    for (const radius of [3000, 4e8]) {
      const a = buildStarField(radius, 1), b = buildStarField(radius, 2);
      for (const name of ['position', 'aColor', 'aSize']) {
        const aa = a.geometry.getAttribute(name), bb = b.geometry.getAttribute(name);
        expect(aa.count).toBe(6000);
        expect(Array.from(aa.array).every(Number.isFinite)).toBe(true);
        expect(aa.array).toEqual(bb.array);
      }
      const p = a.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) expect(Math.abs(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) - radius)).toBeLessThan(radius * 1e-6);
      expect(a.material.uniforms.uPixelRatio.value).toBe(1);
      expect(b.material.uniforms.uPixelRatio.value).toBe(2);
      expect(a.material.depthWrite).toBe(false);
      expect(a.material.depthTest).toBe(true);
      expect(a.frustumCulled).toBe(false);
      a.geometry.dispose(); a.material.dispose(); b.geometry.dispose(); b.material.dispose();
    }
  });

  it.each([357.33 / 480, 700 / 440])('keeps sky directions fixed when zooming, canvas aspect %s', (aspect) => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.01, 10000);
    const stars = buildStarField(3000);
    let ratio = 1;
    const renderer = {
      getPixelRatio: () => ratio,
      setPixelRatio: vi.fn((value: number) => { ratio = value; }),
      render: vi.fn(),
    };
    const earthMat = new THREE.ShaderMaterial({ uniforms: { camPos: { value: new THREE.Vector3() } } });
    const view = Object.assign(Object.create(OrbitView.prototype), {
      camera, stars, renderer, earthMat, scene: new THREE.Scene(), dist: 50, el: 0.3, az: 0.7,
      size: { w: 357.33, h: 480 }, shift: { x: 0, y: 0 },
    }) as { dist: number; render(): void };
    view.render();
    camera.updateMatrixWorld();
    expect(stars.position.equals(camera.position)).toBe(true);
    const ray = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3000);
    const near = ray.clone().add(stars.position).project(camera);
    view.dist = 2000;
    view.render();
    camera.updateMatrixWorld();
    const far = ray.clone().add(stars.position).project(camera);
    expect(stars.position.equals(camera.position)).toBe(true);
    expect(far.x).toBeCloseTo(near.x, 10);
    expect(far.y).toBeCloseTo(near.y, 10);

    // Moving displays changes DPR even when CSS canvas size is unchanged.
    vi.stubGlobal('window', { devicePixelRatio: 3 });
    view.render();
    expect(ratio).toBe(2);
    expect(stars.material.uniforms.uPixelRatio.value).toBe(2);
    vi.stubGlobal('window', { devicePixelRatio: 1.25 });
    view.render();
    expect(ratio).toBe(1.25);
    expect(stars.material.uniforms.uPixelRatio.value).toBe(1.25);
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(2);
    stars.geometry.dispose(); stars.material.dispose(); earthMat.dispose();
  });
});

describe('Orbit equal-time sector resources', () => {
  it('disposes both old geometry and old material whenever sectors rebuild or turn off', () => {
    const perifocal = new THREE.Group();
    const view = Object.assign(Object.create(OrbitView.prototype), {
      ellipse: { geometry: new THREE.BufferGeometry(), computeLineDistances: vi.fn() },
      perigee: new THREE.Object3D(), apogee: new THREE.Object3D(),
      perigeeLabel: new THREE.Object3D(), apogeeLabel: new THREE.Object3D(),
      perifocal, options: { sectors: true }, sectors: null,
    }) as {
      options: { sectors: boolean }; sectors: THREE.Mesh | null;
      ellipse: { geometry: THREE.BufferGeometry };
      rebuildShape(orbit: { a: number; e: number }): void;
    };
    view.rebuildShape({ a: 7e6, e: 0.2 });
    const first = view.sectors!;
    const geometry = vi.spyOn(first.geometry, 'dispose');
    const material = vi.spyOn(first.material as THREE.Material, 'dispose');
    view.rebuildShape({ a: 8e6, e: 0.3 });
    expect(geometry).toHaveBeenCalledOnce();
    expect(material).toHaveBeenCalledOnce();
    expect(perifocal.children).not.toContain(first);
    const second = view.sectors!;
    const secondGeometry = vi.spyOn(second.geometry, 'dispose');
    const secondMaterial = vi.spyOn(second.material as THREE.Material, 'dispose');
    view.options.sectors = false;
    view.rebuildShape({ a: 8e6, e: 0.3 });
    expect(secondGeometry).toHaveBeenCalledOnce();
    expect(secondMaterial).toHaveBeenCalledOnce();
    expect(view.sectors).toBeNull();
    expect(perifocal.children).toHaveLength(0);
    view.ellipse.geometry.dispose();
  });
});
