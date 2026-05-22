// Muhurta — auspicious / inauspicious time slices of the day.
//
// Rahu-kaal, Yamaganda, Gulika each occupy one of 8 equal divisions of
// daylight (sunrise → sunset). Abhijit is a 48-minute window centered on
// local noon (the midpoint of sunrise and sunset). Brahma Muhurta is the
// 48 minutes that begin 96 minutes before sunrise.
//
// The weekday-to-segment mapping below is the standard one used by Drik
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
const ABHIJIT_HALF_MS = 24 * 60 * 1000; // 24 min half-window (48 min total)
const BRAHMA_BEFORE_SUNRISE_MS = 96 * 60 * 1000;
const BRAHMA_DURATION_MS = 48 * 60 * 1000;

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

  const noonMs = (sunrise.getTime() + sunset.getTime()) / 2;
  const abhijit =
    vara === 'wednesday'
      ? null
      : {
          start: new Date(noonMs - ABHIJIT_HALF_MS),
          end: new Date(noonMs + ABHIJIT_HALF_MS),
        };

  const brahmaStart = sunrise.getTime() - BRAHMA_BEFORE_SUNRISE_MS;
  const brahmaMuhurta = {
    start: new Date(brahmaStart),
    end: new Date(brahmaStart + BRAHMA_DURATION_MS),
  };

  return {
    rahuKaal: segment(sunrise, sunset, map.rahuKaal),
    yamaganda: segment(sunrise, sunset, map.yamaganda),
    gulika: segment(sunrise, sunset, map.gulika),
    abhijit,
    brahmaMuhurta,
  };
}
