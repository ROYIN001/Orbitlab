/**
 * A designed satellite's figures as tables (roadmap D06; Phase 4 map §2.7,
 * track B): each subsystem's rows — a label, the figure with its unit, and
 * "estimate" where it is one — read from `designFigures`
 * (src/design/satellite-model.ts), never worked out here. The Explore
 * level's satellite designer shows them all; the Engineer level's bench
 * shows each subsystem's beside its inputs.
 */
import { t } from '../../i18n';
import type { DisposalPlan, SatelliteFigures } from '../../design/satellite-model';
import { sayFig } from './satellite-text';

export type Row = readonly [string, string, string?];

/** The subsystems' tables, in the order the screen lists them; the keys are the sections' titles. */
export type Section = 'orbit' | 'eclipse' | 'power' | 'dv' | 'attitude' | 'link' | 'camera';
export const SECTION_KEY: Readonly<Record<Section, string>> = {
  orbit: 'build.sat.fig.orbit', eclipse: 'build.sat.fig.eclipse', power: 'build.sat.fig.power', dv: 'build.sat.fig.dv',
  attitude: 'build.sat.fig.attitude', link: 'build.sat.fig.link', camera: 'build.sat.fig.camera',
};

const PLAN_KEY: Readonly<Record<DisposalPlan, string>> = {
  reentry: 'build.sat.plan.reentry', graveyard: 'build.sat.plan.graveyard', decay: 'build.sat.plan.decay', none: 'build.sat.plan.none',
};

const est = (): string => t('build.stat.estimate');

export function orbitRows(f: SatelliteFigures): Row[] {
  const o = f.orbit;
  return [
    [t('build.sat.r.apsides'), `${sayFig(o.perigee)} × ${sayFig(o.apogee)}`],
    [t('build.sat.r.inclination'), sayFig(o.inclination, 2)],
    [t('build.sat.r.period'), sayFig(o.nodalPeriod)],
    [t('build.sat.r.revs'), sayFig(o.revsPerDay)],
    [t('build.sat.r.region'), t(o.region === 'geo' ? 'build.sat.region.geo' : o.region === 'leo' ? 'build.sat.region.leo' : 'build.sat.region.other')],
  ];
}

export function eclipseRows(f: SatelliteFigures): Row[] {
  const e = f.eclipse;
  const rows: Row[] = [
    [t('build.sat.r.betaNow'), sayFig(e.beta)],
    [t('build.sat.r.eclipseNow'), `${sayFig(e.now)} (${sayFig(e.nowFraction)})`],
    [t('build.sat.r.eclipseWorst'), `${sayFig(e.worst)} (${sayFig(e.worstFraction)})`],
    [t('build.sat.r.betaWorst'), sayFig(e.worstBeta)],
  ];
  if (e.atBetaZero) rows.push([t('build.sat.r.betaZero'), sayFig(e.atBetaZero, 2)]);
  rows.push([t('build.sat.r.cycles'), sayFig(e.cyclesPerYear), t('build.sat.atMost')]);
  return rows;
}

export function powerRows(f: SatelliteFigures): Row[] {
  const p = f.power;
  return [
    [t('build.sat.r.load'), sayFig(p.load)],
    [t('build.sat.r.sunEclipse'), `${sayFig(p.daylight)} / ${sayFig(p.eclipse)}`],
    [t('build.sat.r.required'), sayFig(p.required)],
    [t('build.sat.r.pEol'), `${sayFig(p.pEol)} (${sayFig(p.lifeFactor, 1)})`],
    [t('build.sat.r.areaNeeded'), sayFig(p.areaNeeded)],
    [t('build.sat.r.area'), sayFig(p.area)],
    [t('build.sat.r.eolPower'), sayFig(p.eolPower)],
    [t('build.sat.r.powerMargin'), p.margin ? sayFig(p.margin) : '—'],
    [t('build.sat.r.batteryNeeded'), sayFig(p.batteryNeeded)],
    [t('build.sat.r.battery'), sayFig(p.battery)],
    [t('build.sat.r.depth'), sayFig(p.depth)],
  ];
}

export function massRows(f: SatelliteFigures): Row[] {
  return [
    [t('build.sat.r.dry'), sayFig(f.mass.dry)],
    [t('build.sat.r.propellant'), sayFig(f.mass.propellant)],
    [t('build.sat.r.wet'), sayFig(f.mass.wet)],
    [t('build.sat.r.dragArea'), sayFig(f.drag.area), est()],
    [t('build.sat.r.ballistic'), sayFig(f.drag.ballistic), est()],
  ];
}

export function dvRows(f: SatelliteFigures): Row[] {
  const d = f.dv;
  if (!d.engine) return [[t('build.sat.r.plan'), t(PLAN_KEY[d.plan])], ...(d.graveyardRise ? [[t('build.sat.r.rise'), sayFig(d.graveyardRise)] as Row] : [])];
  const rows: Row[] = [[t('build.sat.r.insertion'), sayFig(d.insertion)]];
  if (f.orbit.region === 'geo') {
    rows.push([t('build.sat.r.nssk'), sayFig(d.nsskPerYear), est()], [t('build.sat.r.ewsk'), sayFig(d.ewskPerYear)]);
  } else rows.push([t('build.sat.r.makeup'), sayFig(d.dragMakeupPerYear), est()]);
  rows.push(
    [t('build.sat.r.keeping'), sayFig(d.stationKeeping)],
    [`${t('build.sat.r.disposal')}: ${t(PLAN_KEY[d.plan])}`, sayFig(d.disposal)],
  );
  if (d.graveyardRise) rows.push([t('build.sat.r.rise'), sayFig(d.graveyardRise)]);
  rows.push(
    [t('build.sat.r.dvRequired'), sayFig(d.required)],
    [t('build.sat.r.dvAvailable'), sayFig(d.available)],
    [t('build.sat.r.dvMargin'), sayFig(d.margin)],
  );
  if (d.propellantNeeded) rows.push([t('build.sat.r.propellantNeeded'), sayFig(d.propellantNeeded)]);
  return rows;
}

export function attitudeRows(f: SatelliteFigures): Row[] {
  const a = f.attitude;
  const rows: Row[] = [
    [t('build.sat.r.gg'), sayFig(a.gravityGradient), est()],
    [t('build.sat.r.solar'), sayFig(a.solar), est()],
    [t('build.sat.r.aero'), sayFig(a.aero), est()],
    [t('build.sat.r.magnetic'), sayFig(a.magnetic), est()],
    [t('build.sat.r.total'), sayFig(a.total), est()],
  ];
  if (a.wheelNeeded) rows.push([t('build.sat.r.wheelNeeded'), sayFig(a.wheelNeeded)]);
  if (a.biasNeeded) rows.push([t('build.sat.r.biasNeeded'), sayFig(a.biasNeeded)]);
  if (a.wheelMargin) rows.push([t('build.sat.r.wheelMargin'), sayFig(a.wheelMargin)]);
  rows.push(
    [t('build.sat.r.torquer'), sayFig(a.torquerDipole)],
    [t('build.sat.r.density'), sayFig(a.density)],
    [t('build.sat.r.field'), sayFig(a.field)],
  );
  return rows;
}

export function linkRows(f: SatelliteFigures): Row[] {
  const l = f.link;
  const rows: Row[] = [[t('build.sat.r.txGain'), sayFig(l.txGain)]];
  if (l.beamwidth) rows.push([t('build.sat.r.beamwidth'), sayFig(l.beamwidth, 2)], [t('build.sat.r.pointingLoss'), sayFig(l.pointingLoss)]);
  rows.push(
    [t('build.sat.r.eirp'), sayFig(l.eirp)],
    [t('build.sat.r.range'), sayFig(l.range)],
    [t('build.sat.r.pathLoss'), sayFig(l.pathLoss)],
    [t('build.sat.r.rxGain'), sayFig(l.rxGain)],
    [t('build.sat.r.received'), sayFig(l.received)],
    [t('build.sat.r.n0'), sayFig(l.n0)],
    [t('build.sat.r.ptOverN0'), sayFig(l.ptOverN0)],
    [t('build.sat.r.requiredPtOverN0'), sayFig(l.requiredPtOverN0)],
    [t('build.sat.r.linkMargin'), sayFig(l.margin)],
    [t('build.sat.r.maxRate'), sayFig(l.maxRate)],
  );
  if (l.passMax && l.dataPerPass) rows.push([t('build.sat.r.pass'), sayFig(l.passMax)], [t('build.sat.r.dataPerPass'), sayFig(l.dataPerPass)]);
  else rows.push([t('build.sat.r.pass'), t('build.sat.r.inView')]);
  return rows;
}

export function cameraRows(f: SatelliteFigures): Row[] {
  const c = f.camera;
  if (!c) return [];
  const rows: Row[] = [
    [t('build.sat.r.from'), sayFig(c.altitude)],
    [t('build.sat.r.gsd'), sayFig(c.gsd)],
    // from above one Earth radius a look 30° off nadir misses the Earth (the core gives Infinity): said, not two dashes
    [t('build.sat.r.offNadir'), Number.isFinite(c.offNadirAlong.value) ? `${sayFig(c.offNadirAlong)} × ${sayFig(c.offNadirCross)}` : t('build.sat.r.pastHorizon')],
    [t('build.sat.r.diffraction'), sayFig(c.diffraction), t(c.limitedBy === 'aperture' ? 'build.sat.r.limitAperture' : 'build.sat.r.limitPixels')],
    [t('build.sat.r.fov'), sayFig(c.fov, 2)],
    [t('build.sat.r.swath'), c.swath ? sayFig(c.swath) : t('build.sat.r.pastHorizon')],
  ];
  if (c.dataRate) rows.push([t('build.sat.r.cameraRate'), sayFig(c.dataRate)]);
  return rows;
}

export function sectionRows(s: Section, f: SatelliteFigures): Row[] {
  switch (s) {
    case 'orbit': return orbitRows(f);
    case 'eclipse': return eclipseRows(f);
    case 'power': return powerRows(f);
    case 'dv': return [...massRows(f), ...dvRows(f)];
    case 'attitude': return attitudeRows(f);
    case 'link': return linkRows(f);
    case 'camera': return cameraRows(f);
  }
}
