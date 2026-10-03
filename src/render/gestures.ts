/** Shared input rules for the Launch and Orbit viewers. Page overlays keep
 * their native scrolling; a canvas owns only gestures that land on it. */
export interface CameraInputOptions {
  /** A covered scene can remain rendered without accepting camera input. */
  isActive?: () => boolean;
}

export function isCameraInputTarget(event: Event, surface: HTMLElement): boolean {
  if (event.defaultPrevented) return false;
  if (typeof surface.checkVisibility === 'function' && !surface.checkVisibility()) return false;
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  // A canvas has no interactive children. This also prevents a containing
  // viewport from treating a neighbouring text panel as part of its viewer.
  if (surface.tagName === 'CANVAS') return target === surface;
  // Compatibility for callers that attach to an older container surface.
  return typeof target.closest === 'function' && !target.closest(
    'button, select, input, textarea, label, a, [contenteditable], [role="button"], [role="slider"], [role="tab"], .scene-ui, .home-screen',
  );
}

/** Normalize mouse wheels and trackpads without capturing browser zoom.
 * deltaMode is 0 for pixels, 1 for lines and 2 for pages. A line is treated
 * as 16 CSS pixels; a page uses the surface height, not the whole window. */
export function wheelZoomFactor(event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey' | 'metaKey'>, height: number): number | null {
  if (event.ctrlKey || event.metaKey || !Number.isFinite(event.deltaY) || event.deltaY === 0) return null;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, height) : 1;
  // Bound one event so a coarse wheel/page step cannot jump through the scene.
  return Math.exp(Math.max(-1, Math.min(1, event.deltaY * unit * 0.001)));
}
