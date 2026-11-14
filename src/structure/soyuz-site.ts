/**
 * The Soyuz-2.1b / Fregat put together in the order of the launch site
 * (owner, 2026-11-13: "ลำดับประกอบแบบฐานปล่อยจริง"), beside the reference's
 * own order (src/structure/soyuz.ts), which stacks the vehicle upright by
 * what rests on what.
 *
 * What is really done, at Vostochny as at Baikonur (`SITE_SOURCES`): the
 * vehicle is put together lying down, in two separate places (the package
 * may be assembled earlier and stored until the campaign begins). In the launch
 * vehicle's assembly building the four side blocks are joined to the
 * central block, making the "package" of the first and second stages. In
 * the spacecraft's building the satellites on their dispenser are joined to
 * Fregat and closed under the two halves of the fairing: the head unit. At
 * the general assembly the head unit is docked to the third stage, and the
 * third stage to the package. The whole is then rolled out to the pad on
 * its transporter-erector and raised upright.
 *
 * Here that is one more `AssemblySpec` over the same eleven assemblies and
 * the same places, with other things to wait for, and two steps that fit no
 * part (`SITE_OPERATIONS`): the docking of what is already built, and the
 * rollout and erection. They are units of the spec with no shape, so the
 * rules of src/structure/assembly.ts — install, remove, undo, restart, what
 * rests on what, complete or not, a stored state read back — hold for them
 * as for the parts. `siteStand` is where each assembly is drawn meanwhile:
 * lying until the vehicle is erected, the upper part apart from the package
 * until they are docked.
 *
 * An account for learning, of eleven assemblies: the tests, the fuelling of
 * Fregat and of the satellites, the pneumatic and electrical checks and the
 * days they take are named in the steps' notes, not acted out.
 *
 * DOM-free.
 */
import type { AssemblySpec } from './assembly';
import { requiresOf, type OrderRule, type Pose } from './model';
import { SOYUZ_ASSEMBLY, SOYUZ_BOOSTERS, SOYUZ_FAIRING, SOYUZ_UNITS } from './soyuz';

/** The steps that fit no part: the general assembly's docking, and the rollout and erection. */
export const SITE_OPERATIONS = ['site-dock', 'site-erect'] as const;
export type SiteOperation = typeof SITE_OPERATIONS[number];

const after = (unit: string, a: string, why: string): OrderRule => ({ unit, after: a, why: `site.why.${why}` });

/** What each step waits for, and why (text keys `site.why.*`). */
export const SOYUZ_SITE_ORDER: readonly OrderRule[] = [
  // the package: the side blocks, and the truss the third stage will meet, on the central block
  ...SOYUZ_BOOSTERS.map((b) => after(b, 'core', 'package')),
  after('interstage', 'core', 'truss'),
  // the head unit: the payload on Fregat, then the fairing closed round both
  after('payload', 'fregat', 'payload'),
  ...SOYUZ_FAIRING.flatMap((f) => [after(f, 'fregat', 'fairing'), after(f, 'payload', 'fairing')]),
  // the general assembly: the head unit, closed, to the third stage; then the two built halves to one another
  ...SOYUZ_FAIRING.map((f) => after('stage3', f, 'stage3')),
  ...SOYUZ_UNITS.map((u) => after('site-dock', u, 'dock')),
  after('site-erect', 'site-dock', 'erect'),
];

/** The same assemblies in the same places as the reference's, each the way round the reference has it, with the site's steps after them. */
export const SOYUZ_SITE_ASSEMBLY: AssemblySpec = {
  units: [
    ...SOYUZ_ASSEMBLY.units.map((u) => ({ ...u, requires: requiresOf(SOYUZ_SITE_ORDER, u.id) })),
    ...SITE_OPERATIONS.map((id) => ({ id, slots: [id], requires: requiresOf(SOYUZ_SITE_ORDER, id), orientations: 1 })),
  ],
  slots: [...SOYUZ_ASSEMBLY.slots, ...SITE_OPERATIONS.map((id) => ({ id, reference: id }))],
};

/** The assemblies built apart from the package until the general assembly: the head unit, and the third stage it is docked to first. */
export const SITE_UPPER: ReadonlySet<string> = new Set(['stage3', 'fregat', 'payload', ...SOYUZ_FAIRING]);

/** How far the upper part lies from the package before they are docked, m along the vehicle's axis. */
export const SITE_GAP = 9;
/** The vehicle's axis above the floor while it lies, m: clear of the side blocks' reach (about 5.2 m from the axis). */
export const SITE_LIFT = 6.4;
/** The vehicle's length, m (the page's model, base to the fairing's tip), to lie about the middle of the floor. */
export const SITE_LENGTH = 46.3;

/**
 * Where an assembly is drawn under the site's order, given where the
 * reference would have it (`base`: its place, its own turn) and what is done
 * so far: the upper part `SITE_GAP` along the axis from the package until
 * they are docked; the whole lying, its base towards −x and its tip towards
 * +x, until it is erected.
 */
export function siteStand(base: Pose, unit: string, done: Readonly<Record<string, unknown>>): Pose {
  const along = SITE_UPPER.has(unit) && !Object.hasOwn(done, 'site-dock') ? SITE_GAP : 0;
  const [x, y, z] = [base.move[0], base.move[1] + along, base.move[2]];
  if (Object.hasOwn(done, 'site-erect')) return { ...base, move: [x, y, z] };
  // lying: a quarter turn about z takes the vehicle's up to +x (and a move with it: (x, y, z) to (y, −x, z)), then lifted clear of the floor
  return {
    move: [y - (SITE_LENGTH + SITE_GAP) / 2, SITE_LIFT - x, z],
    turns: [...(base.turns ?? []), { axis: 'z', angle: -Math.PI / 2, pivot: [0, 0, 0] }],
    visible: base.visible,
  };
}

/**
 * Where the order is taken from (what each says is text key `site.src.<id>`).
 * The launch kit and the manual were read for this work, and the passages
 * relied on found in them (2026-11-13); the kit is this mission's own, the
 * manual describes Baikonur, whose horizontal method Vostochny keeps. The
 * RussianSpaceWeb page is a secondary witness that relays Roscosmos's
 * announcements, for a Soyuz-2.1b / Fregat flight from Vostochny in 2019.
 */
export const SITE_SOURCES: readonly { id: string; title: string; url: string; primary: boolean }[] = [
  { id: 'kit', title: 'Arianespace / Starsem, Flight ST31 launch kit (April 2021), pp. 8 and 12–13', url: 'https://www.starsem.com/news/images/ST31-launchkit.pdf', primary: true },
  { id: 'manual', title: 'Starsem, Soyuz User’s Manual ST-GTD-SUM-01, Issue 3 (April 2001), §7.5.4 and Figure 1-4', url: 'https://www.starsem.com/services/images/soyuz_users_manual_190401.pdf', primary: true },
  { id: 'rsw', title: 'A. Zak, RussianSpaceWeb, “Soyuz-2-1b launches Meteor-M2-2” (2019)', url: 'https://www.russianspaceweb.com/meteor-m2-2.html', primary: false },
];
