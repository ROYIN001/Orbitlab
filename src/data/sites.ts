import type { LaunchSiteSpec } from '../types';

export interface SiteExtra extends LaunchSiteSpec {
  /** Use the southbound launch solution for polar / sun-synchronous targets */
  descendingForPolar: boolean;
}

export const SITES: SiteExtra[] = [
  { id: 'baikonur', name: 'Baikonur Cosmodrome', country: 'KZ', latitude: 45.965, longitude: 63.305, altitude: 90, minInclination: 51.6, azimuthMin: 30, azimuthMax: 200, tz: 'UTC+5', descendingForPolar: false },
  { id: 'plesetsk', name: 'Plesetsk Cosmodrome', country: 'RU', latitude: 62.925, longitude: 40.578, altitude: 100, minInclination: 62.8, azimuthMin: 330, azimuthMax: 90, tz: 'UTC+3', descendingForPolar: false },
  { id: 'vostochny', name: 'Vostochny Cosmodrome', country: 'RU', latitude: 51.884, longitude: 128.334, altitude: 250, minInclination: 51.7, azimuthMin: 30, azimuthMax: 200, tz: 'UTC+9', descendingForPolar: false },
  { id: 'cape', name: 'Cape Canaveral / KSC', country: 'US', latitude: 28.562, longitude: -80.577, altitude: 3, minInclination: 28.5, azimuthMin: 35, azimuthMax: 120, tz: 'UTC-5', descendingForPolar: false },
  { id: 'vandenberg', name: 'Vandenberg SFB', country: 'US', latitude: 34.742, longitude: -120.573, altitude: 100, minInclination: 60, azimuthMin: 147, azimuthMax: 201, tz: 'UTC-8', descendingForPolar: true },
  { id: 'wallops', name: 'Wallops Flight Facility', country: 'US', latitude: 37.84, longitude: -75.47, altitude: 3, minInclination: 38, azimuthMin: 90, azimuthMax: 160, tz: 'UTC-5', descendingForPolar: true },
  { id: 'starbase', name: 'Starbase (Boca Chica)', country: 'US', latitude: 25.997, longitude: -97.155, altitude: 5, minInclination: 26, azimuthMin: 80, azimuthMax: 110, tz: 'UTC-6', descendingForPolar: false },
  { id: 'kourou', name: 'Guiana Space Centre (Kourou)', country: 'FR', latitude: 5.239, longitude: -52.768, altitude: 10, minInclination: 5.2, azimuthMin: 350, azimuthMax: 94, tz: 'UTC-3', descendingForPolar: false },
  { id: 'wenchang', name: 'Wenchang Space Launch Site', country: 'CN', latitude: 19.614, longitude: 110.951, altitude: 10, minInclination: 19.5, azimuthMin: 60, azimuthMax: 180, tz: 'UTC+8', descendingForPolar: true },
  { id: 'tanegashima', name: 'Tanegashima Space Center', country: 'JP', latitude: 30.4, longitude: 130.97, altitude: 10, minInclination: 30.4, azimuthMin: 90, azimuthMax: 190, tz: 'UTC+9', descendingForPolar: true },
  { id: 'sriharikota', name: 'Satish Dhawan Space Centre', country: 'IN', latitude: 13.72, longitude: 80.23, altitude: 10, minInclination: 13.7, azimuthMin: 90, azimuthMax: 180, tz: 'UTC+5:30', descendingForPolar: true },
  { id: 'mahia', name: 'Rocket Lab LC-1 (Mahia)', country: 'NZ', latitude: -39.26, longitude: 177.865, altitude: 40, minInclination: 39, azimuthMin: 90, azimuthMax: 200, tz: 'UTC+12', descendingForPolar: true },
];

export const siteById = (id: string): SiteExtra => {
  const s = SITES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown site ${id}`);
  return s;
};
