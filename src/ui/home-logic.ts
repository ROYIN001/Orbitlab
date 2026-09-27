/**
 * The landing page's prototypes (backgrounds for the same page, to be
 * compared before one is kept): which one is showing, and the small pieces of
 * arithmetic they share. DOM-free: tests/home-logic.test.ts holds it.
 *
 * A  the vehicle on its pad, filmed: a slow camera move and the pad's light
 * B  scrolling the page flies the launch, a chapter of the page per event
 * D  the Earth with the real satellites where they are now, the Thai ones named
 * F  B's flight, then the camera pulls back to D's globe: the orbit flown among the real satellites
 * G  the globe turned to the visitor's city: what is above it now, and what comes over next
 * H  D's globe with the viewer's launches drawn on it, one after another, as the simulator flies them
 * I  F, launched by the visitor: the first screen's button is held down to count down and lift off
 * J  B's scroll with no readouts and no launch steps — the page's own chapters over the rocket
 *    climbing to the edge of space — ending on the globe with the International Space Station
 * K  the rocket on its pad, then the program shown off a chapter at a time (the app's own
 *    screens, over a starry sky), ending on D's globe with only the space station on it
 *
 * (C, the first seconds of the launch looped, and E, a line-up of rockets to
 * scale, were tried and set aside, 2026-09-27.)
 */
import { gmst, julianDate, sunDirectionEci } from '../physics/orbital';

export type HomeVariant = 'a' | 'b' | 'd' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k';
export const HOME_VARIANTS: readonly HomeVariant[] = ['a', 'b', 'd', 'f', 'g', 'h', 'i', 'j', 'k'];
/** the variants whose page is a flight in chapters, read by scrolling */
export const isJourney = (v: HomeVariant): boolean => v === 'b' || v === 'f' || v === 'i' || v === 'j';
/** the variants that end on the globe */
export const endsOnGlobe = (v: HomeVariant): boolean => v === 'f' || v === 'i' || v === 'j';
/** the variants whose picture is the globe (F's only at its end) */
export const isGlobe = (v: HomeVariant): boolean => v === 'd' || v === 'g' || v === 'h';
/** `?home=b` opens the page on a prototype; the choice is kept in this browser */
export const HOME_VARIANT_PARAM = 'home';
export const HOME_VARIANT_STORAGE_KEY = 'orbitlab.homeVariant';

export function parseVariant(value: string | null | undefined): HomeVariant | null {
  return HOME_VARIANTS.find((v) => v === value?.trim().toLowerCase()) ?? null;
}

/** A: the light the pad stands in. */
export type PadLight = 'day' | 'dusk' | 'night';
export const PAD_LIGHTS: readonly PadLight[] = ['day', 'dusk', 'night'];
/**
 * The Sun's elevation below the horizon each light but the day (the viewer's
 * own daylight launch time) is set at, deg: dusk just after sunset, while the
 * sky still glows; night past astronomical twilight.
 */
export const PAD_LIGHT_SUN: Record<Exclude<PadLight, 'day'>, number> = { dusk: -2, night: -20 };

/** The Sun's elevation above a place's horizon at a moment, deg. */
export function sunElevation(date: Date, latitudeDeg: number, longitudeDeg: number): number {
  const jd = julianDate(date);
  const lat = latitudeDeg * Math.PI / 180, lon = longitudeDeg * Math.PI / 180 + gmst(jd);
  const s = sunDirectionEci(jd);
  const up = Math.cos(lat) * Math.cos(lon) * s.x + Math.cos(lat) * Math.sin(lon) * s.y + Math.sin(lat) * s.z;
  return Math.asin(Math.max(-1, Math.min(1, up))) * 180 / Math.PI;
}

/**
 * The first moment after `base` at which the Sun sinks through `elevationDeg`
 * at the place: the evening launch time that puts the pad in that light.
 * Searched in two-minute steps over the next day; `base` itself when it never
 * does (a polar summer).
 */
export function eveningAt(base: Date, latitudeDeg: number, longitudeDeg: number, elevationDeg: number): Date {
  const step = 120e3;
  let before = sunElevation(base, latitudeDeg, longitudeDeg);
  for (let t = base.getTime() + step; t <= base.getTime() + 86400e3; t += step) {
    const now = sunElevation(new Date(t), latitudeDeg, longitudeDeg);
    if (before >= elevationDeg && now < elevationDeg) return new Date(t);
    before = now;
  }
  return new Date(base.getTime());
}

/** B: a chapter's top on the page (px from the top of the scroller) and the mission time it stands for. */
export interface ScrollAnchor {
  top: number;
  t: number;
}

/**
 * B: the mission time at a scroll position — straight lines between the
 * chapters' anchors, held at the ends. Each chapter reaches its moment of the
 * flight when its top reaches the top of the page.
 */
export function timeAtScroll(anchors: readonly ScrollAnchor[], scroll: number): number {
  if (anchors.length === 0) return 0;
  if (scroll <= anchors[0].top) return anchors[0].t;
  for (let k = 1; k < anchors.length; k++) {
    const a = anchors[k - 1], b = anchors[k];
    if (scroll <= b.top) return b.top > a.top ? a.t + (b.t - a.t) * (scroll - a.top) / (b.top - a.top) : b.t;
  }
  return anchors[anchors.length - 1].t;
}

/**
 * B: the flight is computed ahead of the page to this mission time, s (the
 * spacecraft is away at T+534 s, the page's last chapter is read at T+540 s);
 * once the recording holds `SCROLL_FLIGHT_ENOUGH` the flight is stopped.
 */
export const SCROLL_FLIGHT_END = 570;
export const SCROLL_FLIGHT_ENOUGH = 548;
/**
 * J: the flight is only flown to the edge of space (the fairing goes at
 * T+157 s, 100 km up), where the globe takes over: computed ahead to
 * `J_FLIGHT_END`, shown up to `J_FLIGHT_TOP`.
 */
export const J_FLIGHT_END = 185;
export const J_FLIGHT_TOP = 165;
/**
 * I: the mission time the flight starts from when the button has been held:
 * the engines already lit (ignition is at T−2.5 s), so the rocket rises a
 * moment after the count reaches zero, while "Liftoff!" is still on screen.
 */
export const HOLD_LAUNCH_FROM = -1.2;
/** I: how long the button is held to launch, s */
export const HOLD_SECONDS = 3;

/**
 * I: the moment shown, once launched — the flight runs on in real time from
 * the launch, and scrolling ahead of it takes it there and on from there;
 * scrolling back does not turn it back (a rocket is not un-launched).
 */
export function launchedTime(clock: number, scrollTime: number): number {
  return Math.max(clock, scrollTime);
}

/**
 * G: how far round the Earth from a place, rad, a satellite at `altitude`
 * (m) can be and still stand `minElevation` (rad) above the place's
 * horizon — the radius of the ring drawn round it.
 */
export function skyRingAngle(altitude: number, minElevation: number, earthRadius = 6371e3): number {
  return Math.acos(earthRadius / (earthRadius + altitude) * Math.cos(minElevation)) - minElevation;
}

/** G: the places a visitor can stand (src/orbit/applications-setup.ts STATIONS), each with the time zone its clocks keep. */
export const STATION_ZONES: Record<string, string> = {
  bangkok: 'Asia/Bangkok', chiangMai: 'Asia/Bangkok', hatYai: 'Asia/Bangkok', ubon: 'Asia/Bangkok',
  stPetersburg: 'Europe/Moscow', moscow: 'Europe/Moscow',
};

/** G: the place to start from, guessed from the browser's time zone (nothing is asked of it): Moscow's zone, Moscow; anything else, Bangkok. */
export function stationForZone(zone: string | undefined): string {
  return zone === 'Europe/Moscow' ? 'moscow' : 'bangkok';
}

/**
 * Where the subject of the picture goes, as a shift off the middle in
 * fractions of the viewport (+x right, +y down): to the right of the text on
 * a wide screen, above it on a narrow one, where the text sits at the bottom.
 */
export function pictureShift(width: number, height: number, variant: HomeVariant): { x: number; y: number } {
  if (width >= 860) return { x: isGlobe(variant) ? 0.2 : 0.24, y: 0 };
  return { x: 0, y: height > width ? -0.2 : -0.1 };
}
