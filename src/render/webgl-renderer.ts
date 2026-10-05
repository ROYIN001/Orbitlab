import { Color, WebGLRenderer, type WebGLRendererParameters } from 'three';
import { t } from '../i18n';

/** Context creation failed; other renderer/startup exceptions keep their own identity. */
export class WebGLContextError extends Error {
  constructor(cause: unknown, details: string[] = []) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super([message, ...new Set(details)].join('\n'), { cause });
    this.name = 'WebGLContextError';
  }
}

type RendererOptions = Omit<WebGLRendererParameters, 'canvas' | 'context' | 'powerPreference'> & {
  canvas: HTMLCanvasElement;
};

/**
 * Prefer the fast GPU, but let the browser choose when that request fails.
 * Retry inside context creation, before Three's diagnostic attribute-free
 * probe can create a context with different antialias/depth settings. Keep
 * Three in charge of renderer setup, including its opaque-canvas behavior.
 * The canvas override exists only during this synchronous constructor.
 */
export function createWebGLRenderer(options: RendererOptions): WebGLRenderer {
  const canvas = options.canvas;
  const original = canvas.getContext;
  const own = Object.getOwnPropertyDescriptor(canvas, 'getContext');
  const details: string[] = [];
  const onFailure = (event: Event): void => {
    const message = (event as WebGLContextEvent).statusMessage;
    if (message) details.push(message);
  };
  canvas.addEventListener('webglcontextcreationerror', onFailure);
  try {
    canvas.getContext = function (this: HTMLCanvasElement, kind: string, attrs?: unknown): RenderingContext | null {
      try {
        const context = original.call(this, kind, attrs);
        if (context || kind !== 'webgl2' || !attrs || typeof attrs !== 'object'
          || (attrs as WebGLContextAttributes).powerPreference !== 'high-performance') return context;
        return original.call(this, kind, { ...attrs, powerPreference: 'default' });
      } catch (error) {
        if (kind === 'webgl2') throw new WebGLContextError(error, details);
        throw error;
      }
    } as HTMLCanvasElement['getContext'];
    const renderer = new WebGLRenderer({ ...options, powerPreference: 'high-performance' });
    // FX-8: a lost context is accepted, so the browser may give it back; three
    // then rebuilds its state, all but the clear colour. The flight runs on
    // meanwhile, and a line says the view paused.
    const clear = new Color();
    let alpha = 1;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      renderer.getClearColor(clear);
      alpha = renderer.getClearAlpha();
      lostNote(canvas, true);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      renderer.setClearColor(clear, alpha);
      lostNote(canvas, false);
    });
    return renderer;
  } catch (error) {
    if (error instanceof Error && /^THREE\.WebGLRenderer: Error creating WebGL context(?: with your selected attributes)?\.$/.test(error.message)) {
      throw new WebGLContextError(error, details);
    }
    throw error;
  } finally {
    if (own) Object.defineProperty(canvas, 'getContext', own);
    else Reflect.deleteProperty(canvas, 'getContext');
    canvas.removeEventListener('webglcontextcreationerror', onFailure);
  }
}

const lost = new Set<HTMLCanvasElement>();

/** FX-8: the status line shown while any 3-D view has lost its context. */
function lostNote(canvas: HTMLCanvasElement, on: boolean): void {
  if (on) lost.add(canvas); else lost.delete(canvas);
  let note = document.getElementById('gl-lost');
  if (!lost.size) { note?.remove(); return; }
  if (!note) {
    note = document.createElement('p');
    note.id = 'gl-lost';
    note.className = 'pwa-toast gl-lost';
    note.setAttribute('role', 'status');
    document.body.append(note);
  }
  note.textContent = t('startup.glLost');
}
