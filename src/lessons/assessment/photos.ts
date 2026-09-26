/**
 * Where the photographs the "which vehicle is this?" questions show come from
 * (roadmap E03). All are from Wikimedia Commons under a free licence; the
 * picture is shown with its author and licence, as CC BY and CC BY-SA ask.
 * Resized to at most 560 × 720 for the page; public/lessons/vehicles/CREDITS.txt
 * says the same.
 */
export interface PhotoCredit {
  readonly author: string;
  readonly license: string;
  readonly licenseUrl?: string;
  readonly source: string;
}

export const VEHICLE_PHOTOS: Readonly<Record<string, PhotoCredit>> = {
  soyuz21a: { author: 'NASA/Victor Zelentsov', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Expedition_50_Soyuz_Rollout_(NHQ201611140038).jpg' },
  falcon9: { author: 'NASA/Joel Kowsky', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:NHQ202210010026_orig.jpg' },
  falconheavy: { author: 'SpaceX', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0', source: 'https://commons.wikimedia.org/wiki/File:Falcon_Heavy_cropped.jpg' },
  starship: { author: 'Hotel Pika', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', source: 'https://commons.wikimedia.org/wiki/File:Starship_full_stack_with_Jeep.jpg' },
  electron: { author: 'NASA Kennedy Space Center / Rocket Lab', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Rocket_Lab_PREFIRE_and_Ice_Launch_(KSC-20240605-PH-RKL01_0004).jpg' },
  atlasv551: { author: 'NASA', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Atlas_V_551_with_New_Horizons_on_Launch_Pad_41.jpg' },
  vulcan: { author: 'NASA/Ben Smegelsky', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Vulcan_Centaur_rollout_(Peregrine)_(cropped).jpg' },
  longmarch5: { author: 'Xiaojun Wang, China Academy of Launch Vehicle Technology', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Long_March_5_rolling_out_at_WSLS.jpg' },
  angaraa5: { author: 'Russian Ministry of Defense', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Launch_of_Angara-A5_from_Plesetsk_Cosmodrome_(2021-12-28)_2.jpg' },
  longmarch2d: { author: 'Cristóbal Alvarado Minic', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', source: 'https://commons.wikimedia.org/wiki/File:Long_March_2D_launching_VRSS-1.jpg' },
  protonm: { author: 'alexpgp', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', source: 'https://commons.wikimedia.org/wiki/File:On_the_launch_pad.jpg' },
};
