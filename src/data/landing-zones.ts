/**
 * Where a returning first stage is flown back to: two landing pads at Cape
 * Canaveral and the tower that catches Super Heavy at Starbase.
 *
 * Landing Zones 1 and 2 are SpaceX's two landing pads at Cape Canaveral, on
 * the old Launch Complex 13, about 9 km south of SLC-40 and 15 km south of
 * LC-39A. Each is a concrete circle 86 m across (282 ft) with the stylised X
 * in the middle; they stand about 300 m apart, LZ-2 to the north-west.
 * Coordinates are the pad centres from Wikidata (Q22078213, Q109558428).
 *
 * The landing surface's height is not stored: the simulation's ground is the
 * launch site's own elevation for 50 km around the pad (`groundElevation`),
 * and a pad has to be where the ground is or a touchdown on it would be judged
 * against the wrong surface.
 */
export interface LandingZoneSpec {
  id: string;
  name: string;
  /** launch sites whose flights can fly back here */
  siteIds: readonly string[];
  /** degrees */
  latitude: number;
  longitude: number;
  /** a pad to land on, or a launch tower whose arms catch the booster */
  kind: 'pad' | 'tower';
  /**
   * Radius of the landing surface, m: a touchdown further out has missed it.
   * For a tower, how far off the tower's catch point the booster's axis may
   * be for the arms to close on it.
   */
  radius: number;
  /** a tower's arms hold the booster with its base this high above the ground, m */
  catchHeight?: number;
}

export const LANDING_ZONES: readonly LandingZoneSpec[] = [
  { id: 'lz1', name: 'Landing Zone 1', siteIds: ['cape', 'ksc39a'], latitude: 28.48575, longitude: -80.54294, kind: 'pad', radius: 43 },
  { id: 'lz2', name: 'Landing Zone 2', siteIds: ['cape', 'ksc39a'], latitude: 28.48775, longitude: -80.54494, kind: 'pad', radius: 43 },
  // Starbase's launch tower catches Super Heavy on the chopsticks, over the
  // launch mount it lifted off from, so the catch point is the pad itself
  // (the site's coordinates in src/data/sites.ts, which is where the mount is
  // drawn). The arms take the booster by the catch pins below its grid fins,
  // about 64 m up a 71 m booster. Like every height at a pad, the catch
  // height is measured from the level the vehicle stands on at liftoff, which
  // at Starbase is the top of the launch mount, some 33 m over the ground
  // (src/render/pads.ts draws it there): closed at about 110 m over the
  // ground, the arms hold the booster's base 13 m above the mount (an
  // estimate: the catch height is not published). A 4 m envelope for the
  // arms to close on is an estimate too.
  { id: 'olm', name: 'Starbase launch tower', siteIds: ['starbase'], latitude: 25.997, longitude: -97.155, kind: 'tower', radius: 4, catchHeight: 13 },
];

export function landingZoneById(id: string): LandingZoneSpec {
  const zone = LANDING_ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Unknown landing zone ${id}`);
  return zone;
}

/** The landing zones a flight from `siteId` can return to. */
export function landingZonesForSite(siteId: string): LandingZoneSpec[] {
  return LANDING_ZONES.filter((z) => z.siteIds.includes(siteId));
}
