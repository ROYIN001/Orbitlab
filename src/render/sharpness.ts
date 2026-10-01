/**
 * How sharp the views are drawn: the texture filtering for the Earth's maps
 * and the pixel-ratio ceiling of the light-weight 3-D views. Kept out of
 * `scene.ts` so the orbit views do not pull the launch scene into their chunk.
 */
import * as THREE from 'three';
import type { EarthTextures } from './scene';

/**
 * Pixel-ratio ceiling for the orbit views: a globe, a few lines and labels,
 * cheap enough to draw at a phone's full 3x. The launch scene keeps its own
 * ceiling of 2 — it renders through a multisampled half-float target and a
 * bloom chain, where 3x would cost 2.25 times the fill for little that shows.
 */
export const ORBIT_VIEW_MAX_PIXEL_RATIO = 3;

/**
 * Anisotropic filtering for the Earth's maps, as much as the GPU offers (the
 * cap is 16 everywhere it exists). The globe is seen edge-on from the pad and
 * from low orbit, and at 4x the ground toward the horizon smeared into a blur
 * a few hundred kilometres out; the cost of 16x on one sphere is negligible.
 */
export function sharpenEarthTextures(renderer: THREE.WebGLRenderer, tex: EarthTextures): void {
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  for (const t of [tex.day, tex.night, tex.spec, tex.normal, tex.clouds]) {
    if (t && t.anisotropy !== aniso) { t.anisotropy = aniso; t.needsUpdate = true; }
  }
}
