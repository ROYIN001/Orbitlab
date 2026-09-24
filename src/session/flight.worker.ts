/// <reference lib="webworker" />
/**
 * The physics worker's entry point: a `SimCore` on the worker's message port.
 * A fast-forward yields between chunks through a message channel rather than
 * `setTimeout`, whose nesting clamp would add 4 ms to every 30 ms chunk.
 */
import { SimCore } from './core';
import type { ToCore } from './protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const continuations: Array<() => void> = [];
const channel = new MessageChannel();
channel.port1.onmessage = () => continuations.shift()?.();

const core = new SimCore({
  post: (message) => scope.postMessage(message),
  later: (fn) => { continuations.push(fn); channel.port2.postMessage(0); },
  now: () => performance.now(),
});

scope.onmessage = (event: MessageEvent<ToCore>) => core.handle(event.data);
