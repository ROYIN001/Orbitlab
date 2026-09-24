import { afterEach, describe, expect, it, vi } from 'vitest';
import { RigidControls } from '../src/ui/rigid-controls';
import type { RigidCommand, RigidTelemetry } from '../src/physics/rigid/telemetry';
import { DEG } from '../src/physics/constants';

/** Small event-capable DOM surface: this checks class interaction state, not
 * layout, native numeric validity, focus behavior, or browser rendering. */
class Element {
  readonly tagName: string;
  children: Element[] = [];
  value = ''; textContent = ''; hidden = false; disabled = false;
  type = ''; min = ''; max = ''; step = ''; className = ''; open = false;
  validity = { valid: true };
  classList = { add: (_name: string) => {} };
  private listeners = new Map<string, Array<() => void>>();
  constructor(name: string) { this.tagName = name.toUpperCase(); }
  get valueAsNumber(): number { return Number(this.value); }
  append(...children: (Element | string)[]): void { this.children.push(...children.map(text)); }
  replaceChildren(...children: (Element | string)[]): void { this.children = children.map(text); }
  setAttribute(_name: string, _value: string): void {}
  addEventListener(name: string, callback: () => void): void {
    const callbacks = this.listeners.get(name) ?? []; callbacks.push(callback); this.listeners.set(name, callbacks);
  }
  dispatch(name: string): void { for (const callback of this.listeners.get(name) ?? []) callback(); }
  all(tag: string): Element[] { return this.children.flatMap(child => [...(child.tagName === tag.toUpperCase() ? [child] : []), ...child.all(tag)]); }
}

/** A string appended as a node, as the DOM does. */
const text = (child: Element | string): Element => (typeof child === 'string' ? Object.assign(new Element('#text'), { textContent: child }) : child);

function frame(mode: 'auto' | 'manual', roll = 0, throttle = 1): RigidTelemetry {
  return { modelVersion: 'test', attitudeQ: { w: 1, x: 0, y: 0, z: 0 }, omegaBody: { x: 0, y: 0, z: 0 },
    cgBody: { x: 0, y: 0, z: 0 }, inertiaBody: [1, 0, 0, 0, 1, 0, 0, 0, 1], renderOffsetBody: { x: 0, y: 0, z: 0 },
    controlMode: mode, commandRatesBody: { x: roll * DEG, y: 0, z: 0 }, commandThrottle: throttle,
    engineDeflections: {}, rcsPropellantKg: 10, saturated: false, angleOfAttack: 0, sideslip: 0,
    aeroWithinEnvelope: true, windECI: { x: 0, y: 0, z: 0 }, rawQuaternionNormError: 0 };
}

function mount(accept: (command: RigidCommand) => void) {
  vi.stubGlobal('document', { createElement: (name: string) => new Element(name), createTextNode: () => new Element('#text'), activeElement: null });
  const host = new Element('div');
  const control = new RigidControls(host as unknown as HTMLElement, accept);
  return { host, control };
}
afterEach(() => vi.unstubAllGlobals());

describe('rigid flight control interactions', () => {
  it('keeps an accepted mode/rate change visible while the next periodic frame is pending', () => {
    const accepted: RigidCommand[] = [];
    const { host, control } = mount(command => accepted.push(command));
    control.update(frame('auto'), true);
    const mode = host.all('select')[0]; mode.value = 'manual'; mode.dispatch('change');
    expect(accepted.at(-1)!.mode).toBe('manual');
    expect(mode.value).toBe('manual');
    expect(host.all('input').every(input => !input.disabled)).toBe(true);
    const roll = host.all('input')[0]; roll.value = '1'; roll.dispatch('change');
    expect(accepted.at(-1)).toEqual({ mode: 'manual', rates: { x: DEG, y: 0, z: 0 }, throttle: 1 });
  });

  it('shows recorded values read-only during replay and restores the current live command afterwards', () => {
    const accepted: RigidCommand[] = [];
    const { host, control } = mount(command => accepted.push(command));
    control.update(frame('manual', 1, 0.6), true);
    control.update(frame('auto', 0, 1), false);
    expect(host.all('select')[0].value).toBe('auto');
    expect(host.all('input').map(input => Number(input.value))).toEqual([0, 0, 0, 100]);
    expect([...host.all('select'), ...host.all('input'), ...host.all('button')].every(input => input.disabled)).toBe(true);
    control.update(frame('manual', 1, 0.6), true);
    expect(host.all('select')[0].value).toBe('manual');
    expect(host.all('input').map(input => Number(input.value))).toEqual([1, 0, 0, 60]);
    expect(accepted).toEqual([]);
  });
});
