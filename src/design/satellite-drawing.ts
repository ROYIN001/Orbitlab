/**
 * R3.3: the satellite on the bench as a schematic drawing, read from the
 * `SatelliteDesign` the figures are worked out from — the same object, the
 * same revision — so the picture and the numbers cannot disagree.
 *
 * What the design gives is drawn to scale: the bus's width and height, the
 * array's area, the dish's diameter, the camera's aperture, and whether it has
 * an engine. What it does not give is a stated assumption, never presented as
 * the factory's drawing (`assumptions`): a tracking array is two equal wings
 * as tall as the bus, and the dish, the camera and the engine sit on the faces
 * they would point from (the dish and the camera at the Earth, the engine
 * opposite). A body-mounted array is cells on the bus's faces, a spinner's
 * round a cylinder; nothing is drawn that the design says is not there — no
 * array area, no engine, no camera.
 *
 * DOM-free and dictionary-free (the UI words it), like the satellite model.
 */
import type { SatelliteDesign } from './satellite-spec';

/** The parts of the drawing, each the subsystem a bench tab is about. */
export type SatellitePart = 'bus' | 'arrays' | 'antenna' | 'camera' | 'engine';

/** Assumptions the drawing makes where the design gives no figure. */
export type DrawingAssumption =
  | 'wings' // a tracking array as two equal wings, each as tall as the bus
  | 'bodyCells' // body-mounted cells on the bus's faces
  | 'bodyCellsExceed' // more cell area than the body's sunward faces can hold
  | 'spinner' // cells round a cylinder of the bus's size
  | 'antennaFace' // the dish on the Earth-facing face
  | 'cameraFace' // the camera's aperture on the Earth-facing face
  | 'engineFace' // the engine on the face opposite the Earth
  | 'stowedPanels'; // R3.3: stowed, each wing folded into panels as wide as the bus is deep, against its side

export interface SatelliteDrawing {
  /** the body's edges, m */
  bus: { width: number; height: number; depth: number };
  /** a tracking array: each wing's span and height, m, and its area, m² */
  wings: { span: number; height: number; area: number } | null;
  /** body or spinner cells: the area, m² */
  cells: { area: number; mount: 'body' | 'spinner' } | null;
  /** the dish's diameter, m */
  antenna: { diameter: number } | null;
  /** the camera's aperture, m */
  camera: { aperture: number } | null;
  /** the satellite's own engine: thrust, N */
  engine: { thrust: number } | null;
  /** the parts present, in drawing order */
  parts: SatellitePart[];
  assumptions: DrawingAssumption[];
  /** the drawing's extent, m: wings and bus across, dish/camera/engine included down and up */
  extent: { width: number; height: number };
  /**
   * R3.3: the satellite as it rides to orbit, wings folded: each wing's panels
   * (as wide as the bus is deep, so they lie against its side face) and the
   * stowed extent. Null without wings: body and spinner cells, the dish, the
   * camera and the engine are drawn the same either way.
   */
  stowed: { panelsPerWing: number; panelThickness: number; extent: { width: number; height: number } } | null;
}

/** m, a folded panel's thickness as drawn (stated with the stowed assumption; the design gives none) */
export const STOWED_PANEL_THICKNESS = 0.03;

export type SatelliteDrawingResult =
  | { ok: true; drawing: SatelliteDrawing }
  /** a field the drawing needs is not a usable number (a draft being typed): which ones */
  | { ok: false; invalid: string[] };

const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** The drawing of `d`, or which of its fields keep it from being drawn. */
export function satelliteDrawing(d: SatelliteDesign): SatelliteDrawingResult {
  const invalid: string[] = [];
  const { width, height, depth } = d.bus.size;
  if (!positive(width)) invalid.push('bus.size.width');
  if (!positive(height)) invalid.push('bus.size.height');
  if (!positive(depth)) invalid.push('bus.size.depth');
  if (!nonNegative(d.power.arrayArea)) invalid.push('power.arrayArea');
  if (!positive(d.comms.txAntennaD) && d.comms.txAntennaD !== 0) invalid.push('comms.txAntennaD');
  if (d.payload && !positive(d.payload.aperture)) invalid.push('payload.aperture');
  if (d.propulsion && !positive(d.propulsion.thrust)) invalid.push('propulsion.thrust');
  if (invalid.length) return { ok: false, invalid };

  const assumptions: DrawingAssumption[] = [];
  const parts: SatellitePart[] = ['bus'];
  const area = d.power.arrayArea;
  let wings: SatelliteDrawing['wings'] = null;
  let cells: SatelliteDrawing['cells'] = null;
  if (area > 0) {
    parts.push('arrays');
    if (d.power.mount === 'tracking') {
      // two equal wings as tall as the bus: the design gives the area only
      const span = area / 2 / height;
      wings = { span, height, area: area / 2 };
      assumptions.push('wings');
    } else if (d.power.mount === 'spinner') {
      cells = { area, mount: 'spinner' };
      assumptions.push('spinner');
    } else {
      cells = { area, mount: 'body' };
      assumptions.push('bodyCells');
      // the sunward faces a body-fixed array can cover: the two largest faces' worth
      const faces = [width * height, width * depth, height * depth].sort((a, b) => b - a);
      if (area > faces[0] + faces[1] + 1e-9) assumptions.push('bodyCellsExceed');
    }
  }
  const antenna = d.comms.txAntennaD > 0 ? { diameter: d.comms.txAntennaD } : null;
  if (antenna) { parts.push('antenna'); assumptions.push('antennaFace'); }
  const camera = d.payload ? { aperture: d.payload.aperture } : null;
  if (camera) { parts.push('camera'); assumptions.push('cameraFace'); }
  const engine = d.propulsion ? { thrust: d.propulsion.thrust } : null;
  if (engine) { parts.push('engine'); assumptions.push('engineFace'); }

  // below the bus: the dish (as deep as a third of its diameter) or the camera's barrel; above: the nozzle
  const below = Math.max(antenna ? antenna.diameter / 3 : 0, camera ? camera.aperture : 0);
  const above = engine ? Math.min(height, width) * 0.35 : 0;
  const across = Math.max(width + (wings ? 2 * wings.span + 2 * 0.08 * width : 0), antenna?.diameter ?? 0);
  let stowed: SatelliteDrawing['stowed'] = null;
  if (wings) {
    const panelsPerWing = Math.max(1, Math.ceil(wings.span / depth - 1e-9));
    const stack = 2 * panelsPerWing * STOWED_PANEL_THICKNESS;
    stowed = { panelsPerWing, panelThickness: STOWED_PANEL_THICKNESS,
      extent: { width: Math.max(width + stack, antenna?.diameter ?? 0), height: height + below + above } };
    assumptions.push('stowedPanels');
  }
  return {
    ok: true,
    drawing: { bus: { width, height, depth }, wings, cells, antenna, camera, engine, parts, assumptions,
      extent: { width: across, height: height + below + above }, stowed },
  };
}

/** The bench tab that is about each part (src/ui/build/satellite-bench.ts). */
export const PART_TAB: Readonly<Record<SatellitePart, 'power' | 'propulsion' | 'attitude' | 'radio' | 'camera'>> = {
  bus: 'attitude', arrays: 'power', antenna: 'radio', camera: 'camera', engine: 'propulsion',
};
