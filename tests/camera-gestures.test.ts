import { describe, expect, it } from 'vitest';
import { CameraController } from '../src/render/cameras';
import { isCameraInputTarget, wheelZoomFactor } from '../src/render/gestures';

class Surface extends EventTarget {
  tagName = 'CANVAS';
  clientHeight = 480;
  visible = true;
  captures = new Set<number>();
  checkVisibility(): boolean { return this.visible; }
  setPointerCapture(id: number): void { this.captures.add(id); }
  releasePointerCapture(id: number): void { this.captures.delete(id); }
}
function input(surface: Surface, type: string, properties: object = {}): Event {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, properties);
  surface.dispatchEvent(event);
  return event;
}
function wheel(surface: Surface, properties: object = {}): Event {
  return input(surface, 'wheel', { deltaY: 120, deltaMode: 0, ctrlKey: false, metaKey: false, ...properties });
}
function pointer(surface: Surface, type: string, properties: object = {}): Event {
  return input(surface, type, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10, ...properties });
}

describe('Launch camera gesture ownership', () => {
  it('normalizes pixels, lines and pages while preserving fine trackpad motion', () => {
    const pixel = { deltaY: 48, deltaMode: 0, ctrlKey: false, metaKey: false };
    expect(wheelZoomFactor(pixel, 480)).toBe(wheelZoomFactor({ ...pixel, deltaY: 3, deltaMode: 1 }, 480));
    expect(wheelZoomFactor({ ...pixel, deltaY: 1, deltaMode: 2 }, 480)).toBe(wheelZoomFactor({ ...pixel, deltaY: 480 }, 480));
    expect(wheelZoomFactor({ ...pixel, deltaY: 1 }, 480)).toBeCloseTo(Math.exp(0.001));
    expect(wheelZoomFactor({ ...pixel, deltaY: -1 }, 480)).toBeCloseTo(Math.exp(-0.001));
  });

  it('zooms only the visible active viewer and leaves browser zoom and horizontal scroll alone', () => {
    const surface = new Surface();
    const camera = new CameraController();
    let active = false;
    camera.attach(surface as unknown as HTMLElement, { isActive: () => active });
    expect(wheel(surface).defaultPrevented).toBe(false);
    expect(camera.zoom).toBe(1);
    active = true;
    surface.visible = false;
    expect(wheel(surface).defaultPrevented).toBe(false);
    expect(camera.zoom).toBe(1);
    surface.visible = true;
    for (const properties of [{ ctrlKey: true }, { metaKey: true }, { deltaY: 0 }, { deltaY: NaN }]) {
      expect(wheel(surface, properties).defaultPrevented).toBe(false);
      expect(camera.zoom).toBe(1);
    }
    expect(wheel(surface, { deltaY: 48 }).defaultPrevented).toBe(true);
    expect(camera.zoom).toBeCloseTo(Math.exp(0.048));
    camera.mode = 'onboard';
    expect(wheel(surface).defaultPrevented).toBe(false);
    camera.mode = 'map';
    expect(wheel(surface).defaultPrevented).toBe(false);
    camera.mode = 'space';
    const distance = camera.spaceDist;
    expect(wheel(surface, { deltaY: 3, deltaMode: 1 }).defaultPrevented).toBe(true);
    expect(camera.spaceDist).toBeCloseTo(distance * Math.exp(0.048));
  });

  it('ignores neighbouring overlays and already-owned events even for a container caller', () => {
    const surface = new Surface();
    const event = new Event('wheel', { cancelable: true });
    Object.defineProperty(event, 'target', { value: { closest: () => null }, configurable: true });
    expect(isCameraInputTarget(event, surface as unknown as HTMLElement)).toBe(false);
    surface.tagName = 'DIV';
    Object.defineProperty(event, 'target', { value: { closest: () => ({}) }, configurable: true });
    expect(isCameraInputTarget(event, surface as unknown as HTMLElement)).toBe(false);
    event.preventDefault();
    expect(isCameraInputTarget(event, surface as unknown as HTMLElement)).toBe(false);
  });

  it('drops captured drags when the scene becomes covered, and does not capture secondary buttons', () => {
    const surface = new Surface();
    const camera = new CameraController();
    let active = true;
    camera.attach(surface as unknown as HTMLElement, { isActive: () => active });
    pointer(surface, 'pointerdown', { button: 2 });
    expect(surface.captures.size).toBe(0);
    pointer(surface, 'pointerdown');
    pointer(surface, 'pointermove', { clientX: 30 });
    const azimuth = camera.az;
    expect(azimuth).toBeLessThan(0.9);
    active = false;
    pointer(surface, 'pointermove', { clientX: 60 });
    expect(camera.az).toBe(azimuth);
    expect(surface.captures.size).toBe(0);
    active = true;
    pointer(surface, 'pointermove', { clientX: 100 });
    expect(camera.az).toBe(azimuth);
  });

  it('pinches without jumping when one finger remains, and clears cancelled capture', () => {
    const surface = new Surface();
    const camera = new CameraController();
    camera.attach(surface as unknown as HTMLElement);
    pointer(surface, 'pointerdown', { pointerType: 'touch', clientX: 0 });
    pointer(surface, 'pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 100 });
    pointer(surface, 'pointermove', { pointerType: 'touch', pointerId: 2, clientX: 200 });
    expect(camera.zoom).toBe(0.5);
    pointer(surface, 'pointerup', { pointerType: 'touch', pointerId: 2 });
    const azimuth = camera.az;
    pointer(surface, 'pointermove', { pointerType: 'touch', clientX: 5 });
    expect(camera.az).toBeCloseTo(azimuth - 0.04);
    pointer(surface, 'lostpointercapture', { pointerType: 'touch' });
    const stopped = camera.az;
    pointer(surface, 'pointermove', { pointerType: 'touch', clientX: 50 });
    expect(camera.az).toBe(stopped);
  });
});
