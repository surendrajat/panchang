// Muhurta — auspicious / inauspicious time slices of the day.
//
// Inauspicious segment-based (1/8 of daylight each, weekday-mapped per Drik):
//   - Rahu Kaal — bad for new ventures
//   - Yamaganda — bad for travel
//   - Gulika Kaal — generally avoided
//
// Auspicious fixed windows around solar events:
//   - Brahma Muhurta — 48 min ending 48 min before sunrise (96–48 min
//                     before sunrise). The most auspicious of all.
//   - Pratah Sandhya — twilight from 48 min before sunrise to sunrise.
//   - Abhijit Muhurta — 48 min centered on solar noon (midpoint of sun
//                     events). Null on Wednesday per Smarta tradition.
//   - Vijaya Muhurta — the 11th muhurta of the day (10/15 to 11/15 of
//                     daylight); auspicious for victory / new starts.
//   - Godhuli Muhurta — 24 min before to 24 min after sunset
//                     ("cow-dust hour"); auspicious for weddings.
//   - Sayahna Sandhya — evening twilight, sunset to 48 min after.
//   - Nishita Kaal — the 8th of 15 muhurtas of the night (7/15 to 8/15
//                     of the night after sunset). Anchor for night-time
//                     observances like Janmashtami and Maha Shivaratri.
//
// The weekday-to-segment mapping is the standard one used by Drik
// Panchang. Segment 1 = first 1/8 of daylight, segment 8 = last.

import type { MuhurtaInfo, Vara } from './types';

const SEGMENT_BY_WEEKDAY: Record<Vara, { rahuKaal: number; yamaganda: number; gulika: number }> = {
  sunday: { rahuKaal: 8, yamaganda: 5, gulika: 7 },
  monday: { rahuKaal: 2, yamaganda: 4, gulika: 6 },
  tuesday: { rahuKaal: 7, yamaganda: 3, gulika: 5 },
  wednesday: { rahuKaal: 5, yamaganda: 2, gulika: 4 },
  thursday: { rahuKaal: 6, yamaganda: 1, gulika: 3 },
  friday: { rahuKaal: 4, yamaganda: 7, gulika: 2 },
  saturday: { rahuKaal: 3, yamaganda: 6, gulika: 1 },
};

const SEGMENT_COUNT = 8;
const MUHURTA_MS = 48 * 60 * 1000; // 1 muhurta = 48 minutes
const ABHIJIT_HALF_MS = 24 * 60 * 1000; // half of one muhurta
const BRAHMA_BEFORE_SUNRISE_MS = 96 * 60 * 1000;
const GODHULI_HALF_MS = 24 * 60 * 1000; // 24 min half-window around sunset

function segment(sunrise: Date, sunset: Date, segmentNumber: number) {
  const dayMs = sunset.getTime() - sunrise.getTime();
  const segmentMs = dayMs / SEGMENT_COUNT;
  const startMs = sunrise.getTime() + (segmentNumber - 1) * segmentMs;
  return {
    start: new Date(startMs),
    end: new Date(startMs + segmentMs),
  };
}

export function computeMuhurta(vara: Vara, sunrise: Date, sunset: Date): MuhurtaInfo {
  const map = SEGMENT_BY_WEEKDAY[vara];

  const sunriseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();
  const dayMs = sunsetMs - sunriseMs;
  const muhurtaOfDay = dayMs / 15; // 15 muhurtas of daylight

  // Brahma Muhurta — runs from 96 to 48 min before sunrise.
  const brahmaStart = sunriseMs - BRAHMA_BEFORE_SUNRISE_MS;
  const brahmaMuhurta = {
    start: new Date(brahmaStart),
    end: new Date(brahmaStart + MUHURTA_MS),
  };

  // Pratah Sandhya — last 48 min before sunrise (twilight).
  const pratahSandhya = {
    start: new Date(sunriseMs - MUHURTA_MS),
    end: new Date(sunriseMs),
  };

  // Abhijit — 11th muhurta if you count from sunrise; classically taken
  // as the muhurta centred on solar noon. Skipped on Wednesday per
  // Smarta tradition.
  const noonMs = (sunriseMs + sunsetMs) / 2;
  const abhijit =
    vara === 'wednesday'
      ? null
      : {
          start: new Date(noonMs - ABHIJIT_HALF_MS),
          end: new Date(noonMs + ABHIJIT_HALF_MS),
        };

  // Vijaya Muhurta — the 11th muhurta of daylight, counted from sunrise
  // (between Aparahna and Sayahna). Best for new ventures.
  const vijayaMuhurta = {
    start: new Date(sunriseMs + 10 * muhurtaOfDay),
    end: new Date(sunriseMs + 11 * muhurtaOfDay),
  };

  // Godhuli — 24 min centred on sunset.
  const godhuli = {
    start: new Date(sunsetMs - GODHULI_HALF_MS),
    end: new Date(sunsetMs + GODHULI_HALF_MS),
  };

  // Sayahna Sandhya — twilight from sunset to 48 min after.
  const sayahnaSandhya = {
    start: new Date(sunsetMs),
    end: new Date(sunsetMs + MUHURTA_MS),
  };

  // Nishita Kaal — the 8th of 15 night-muhurtas. Approximates next
  // sunrise as sunrise + 24h (good to a few minutes; precise sunrise
  // would require sunRiseSet which isn't injected here).
  const nightMs = sunriseMs + 24 * 3600_000 - sunsetMs;
  const muhurtaOfNight = nightMs / 15;
  const nishitaKaal = {
    start: new Date(sunsetMs + 7 * muhurtaOfNight),
    end: new Date(sunsetMs + 8 * muhurtaOfNight),
  };

  return {
    rahuKaal: segment(sunrise, sunset, map.rahuKaal),
    yamaganda: segment(sunrise, sunset, map.yamaganda),
    gulika: segment(sunrise, sunset, map.gulika),
    abhijit,
    brahmaMuhurta,
    pratahSandhya,
    vijayaMuhurta,
    godhuli,
    sayahnaSandhya,
    nishitaKaal,
  };
}
