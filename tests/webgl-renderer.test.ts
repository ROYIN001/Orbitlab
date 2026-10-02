import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebGLRendererParameters } from 'three';
import { createWebGLRenderer, WebGLContextError } from '../src/render/webgl-renderer';

const { construct } = vi.hoisted(() => ({ construct: vi.fn() }));
vi.mock('three', () => ({
  WebGLRenderer: vi.fn(function (options: WebGLRendererParameters) { return construct(options); }),
}));

const unavailable = 'THREE.WebGLRenderer: Error creating WebGL context.';
const context = {} as WebGL2RenderingContext;
const renderer = { renderer: true };
const attributes: WebGLContextAttributes = {
  alpha: true, antialias: true, depth: true, stencil: false,
  preserveDrawingBuffer: false, premultipliedAlpha: true, failIfMajorPerformanceCaveat: false,
};

function fakeCanvas(getContext: (kind: string, attrs?: WebGLContextAttributes) => WebGL2RenderingContext | null): HTMLCanvasElement {
  return Object.assign(new EventTarget(), { getContext }) as unknown as HTMLCanvasElement;
}

beforeEach(() => {
  construct.mockReset();
  construct.mockImplementation((options: WebGLRendererParameters) => {
    const canvas = options.canvas as HTMLCanvasElement;
    if (!canvas.getContext('webgl2', { ...attributes, powerPreference: options.powerPreference })) throw new Error(unavailable);
    return renderer;
  });
});

describe('WebGL context recovery', () => {
  it('keeps a working preferred GPU and does not create a second renderer or context', () => {
    const get = vi.fn(() => context);
    const canvas = fakeCanvas(get);
    expect(createWebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true })).toBe(renderer);
    expect(get).toHaveBeenCalledExactlyOnceWith('webgl2', { ...attributes, powerPreference: 'high-performance' });
    expect(construct).toHaveBeenCalledOnce();
    expect(construct.mock.calls[0][0].logarithmicDepthBuffer).toBe(true);
    expect(canvas.getContext).toBe(get);
  });

  it('lets the browser choose a GPU without changing the requested quality attributes', () => {
    const get = vi.fn((_kind: string, attrs?: WebGLContextAttributes) => attrs?.powerPreference === 'default' ? context : null);
    const canvas = fakeCanvas(get);
    expect(createWebGLRenderer({ canvas, antialias: true })).toBe(renderer);
    expect(get.mock.calls).toEqual([
      ['webgl2', { ...attributes, powerPreference: 'high-performance' }],
      ['webgl2', { ...attributes, powerPreference: 'default' }],
    ]);
    expect(construct).toHaveBeenCalledOnce();
    expect(canvas.getContext).toBe(get);
  });

  it('preserves browser diagnostics when both context requests fail and removes its listener', () => {
    const canvas = fakeCanvas(() => {
      canvas.dispatchEvent(Object.assign(new Event('webglcontextcreationerror'), { statusMessage: 'WebGL disabled by browser policy' }));
      return null;
    });
    const original = canvas.getContext;
    const remove = vi.spyOn(canvas, 'removeEventListener');
    let failure: unknown;
    try { createWebGLRenderer({ canvas }); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(WebGLContextError);
    expect((failure as Error).message).toBe(`${unavailable}\nWebGL disabled by browser policy`);
    expect(canvas.getContext).toBe(original);
    expect(remove).toHaveBeenCalledExactlyOnceWith('webglcontextcreationerror', expect.any(Function));
  });

  it('reports an exception from the context request as a context failure', () => {
    const cause = new Error('Context denied');
    const canvas = fakeCanvas(() => { throw cause; });
    expect(() => createWebGLRenderer({ canvas })).toThrow(WebGLContextError);
  });

  it('keeps unrelated renderer failures distinct and restores the original property descriptor', () => {
    const cause = new Error('Renderer setup failed');
    construct.mockImplementation(() => { throw cause; });
    const get = () => context;
    const canvas = new EventTarget() as HTMLCanvasElement;
    const prototype = Object.create(Object.getPrototypeOf(canvas), { getContext: { value: get, writable: true, configurable: true } });
    Object.setPrototypeOf(canvas, prototype);
    expect(Object.hasOwn(canvas, 'getContext')).toBe(false);
    expect(() => createWebGLRenderer({ canvas })).toThrow(cause);
    expect(Object.hasOwn(canvas, 'getContext')).toBe(false);
    expect(canvas.getContext).toBe(get);
  });

  it('cleans up when browser customization locks the canvas method', () => {
    const canvas = fakeCanvas(() => context);
    const original = canvas.getContext;
    Object.defineProperty(canvas, 'getContext', { writable: false, configurable: false });
    const remove = vi.spyOn(canvas, 'removeEventListener');
    expect(() => createWebGLRenderer({ canvas })).toThrow(TypeError);
    expect(canvas.getContext).toBe(original);
    expect(remove).toHaveBeenCalledExactlyOnceWith('webglcontextcreationerror', expect.any(Function));
    expect(construct).not.toHaveBeenCalled();
  });
});
