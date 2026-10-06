/** Source-level rendering regressions. No WebGL pixel/appearance claims. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildStarField } from '../src/render/stars';
import { OrbitView } from '../src/render/orbit-view';
import { ORBIT_VIEW_MAX_PIXEL_RATIO } from '../src/render/sharpness';
import { SceneManager } from '../src/render/scene';
import { R_EARTH } from '../src/physics/constants';

// OrbitView.render skips drawing while the page is unseen (render/webgl-renderer.ts `unseen`): a visible page
beforeEach(() => vi.stubGlobal('document', { hidden: false, querySelector: () => null }));
afterEach(() => vi.unstubAllGlobals());

describe('shared Launch/Orbit star field', () => {
  it.each([288 / 480, 240 / 480, 357.33 / 480, 700 / 440])('keeps Orbit stars behind Earth at every zoom, canvas aspect %s', (aspect) => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.01, 10000);
    const stars = buildStarField(3000, 1, true);
    const direction = new THREE.Vector3().fromBufferAttribute(stars.geometry.getAttribute('position'), 0).normalize();
    const earthMat = new THREE.ShaderMaterial({ uniforms: { camPos: { value: new THREE.Vector3() } } });
    const view = Object.assign(Object.create(OrbitView.prototype), {
      camera, stars, earthMat, scene: new THREE.Scene(), dist: 40,
      renderer: { getPixelRatio: () => 1, render: vi.fn() },
      // Aim an actual generated star through the centre of Earth.
      el: Math.asin(-direction.z), az: Math.atan2(-direction.y, -direction.x),
      size: { w: 480 * aspect, h: 480 }, shift: { x: 0, y: 0 },
    }) as { dist: number; shift: { x: number; y: number }; render(): void };
    const earth = new THREE.Sphere(new THREE.Vector3(), R_EARTH * 1e-6);
    for (const dist of [earth.radius * 1.25, 40, 2000]) for (const shift of [{ x: 0, y: 0 }, { x: 0.15, y: -0.1 }]) {
      view.dist = dist; view.shift = shift; view.render(); camera.updateMatrixWorld();
      const hit = new THREE.Ray(camera.position, direction).intersectSphere(earth, new THREE.Vector3());
      expect(hit).not.toBeNull();
      const earthDepth = hit!.clone().project(camera).z;
      const starPosition = direction.clone().multiplyScalar(3000).add(stars.position);
      const clip = new THREE.Vector4(starPosition.x, starPosition.y, starPosition.z, 1)
        .applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
      // Evaluate the shader's explicit far-depth assignment, not WebGL pixels.
      const farDepth = stars.material.defines.BACKGROUND_SKY === 1
        && /gl_Position\.z\s*=\s*gl_Position\.w\s*;/.test(stars.material.vertexShader);
      const starDepth = (farDepth ? clip.w : clip.z) / clip.w;
      expect(starDepth).toBe(1);
      expect(earthDepth).toBeLessThan(starDepth);
      if (dist === 2000 && aspect <= 0.6) {
        // This is the old failure: the ordinary shell was in front of Earth.
        expect(clip.z / clip.w).toBeLessThan(earthDepth);
        expect(camera.position.distanceTo(hit!)).toBeGreaterThan(3000);
      }
    }
    expect(stars.material.depthTest).toBe(true);
    expect(stars.material.depthWrite).toBe(false);
    expect(stars.renderOrder).toBeLessThan(0); // before transparent orbit overlays
    const launch = buildStarField();
    expect(launch.material.defines.BACKGROUND_SKY).toBeUndefined();
    expect(launch.renderOrder).toBe(0);
    launch.geometry.dispose(); launch.material.dispose();
    stars.geometry.dispose(); stars.material.dispose(); earthMat.dispose();
  });

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
    vi.stubGlobal('window', { devicePixelRatio: 4 });
    view.render();
    expect(ratio).toBe(ORBIT_VIEW_MAX_PIXEL_RATIO);
    expect(stars.material.uniforms.uPixelRatio.value).toBe(ORBIT_VIEW_MAX_PIXEL_RATIO);
    vi.stubGlobal('window', { devicePixelRatio: 1.25 });
    view.render();
    expect(ratio).toBe(1.25);
    expect(stars.material.uniforms.uPixelRatio.value).toBe(1.25);
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(2);
    expect(renderer.render).toHaveBeenCalledTimes(4);
    // a hidden tab or an open modal dialog: nothing is drawn, and the next visible frame draws again
    vi.stubGlobal('document', { hidden: true, querySelector: () => null });
    view.render();
    vi.stubGlobal('document', { hidden: false, querySelector: (q: string) => (q === 'dialog.dialog[open]' ? {} : null) });
    view.render();
    expect(renderer.render).toHaveBeenCalledTimes(4);
    vi.stubGlobal('document', { hidden: false, querySelector: () => null });
    view.render();
    expect(renderer.render).toHaveBeenCalledTimes(5);
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
