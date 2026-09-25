/**
 * The service worker's entry (roadmap U03). The build writes the precache
 * manifest over the placeholder below (`injectPrecacheManifest`); the logic
 * is in `sw-core.ts`.
 */
import { installServiceWorker, type PrecacheManifest, type SwScope } from './sw-core';

const manifest = JSON.parse('__ORBITLAB_PRECACHE__') as PrecacheManifest;
installServiceWorker(self as unknown as SwScope, manifest);
