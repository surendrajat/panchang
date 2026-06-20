// Local horizontal coordinates (azimuth + altitude) of a visible body as seen
// from a place on Earth at an instant — for the "what you'd see if you stood and
// watched the sky" dome on the Sky page. Same astronomy-engine source as the
// rest of the engine; includes standard atmospheric refraction.
import { Body, Observer, Equator, Horizon } from 'astronomy-engine';

/** The bodies you can actually see with the naked eye (no Rahu/Ketu — those are
 *  the invisible lunar nodes, not objects in the sky). */
export type SkyBody = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

const BODY: Record<SkyBody, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
};

export interface AltAz {
  /** degrees clockwise from due North (0 = N, 90 = E, 180 = S, 270 = W) */
  azimuth: number;
  /** degrees above the horizon (0 = horizon, 90 = zenith, negative = below) */
  altitude: number;
}

export function bodyAltAz(
  body: SkyBody,
  date: Date,
  latitude: number,
  longitude: number,
  altitudeMeters = 0,
): AltAz {
  const observer = new Observer(latitude, longitude, altitudeMeters);
  const eq = Equator(BODY[body], date, observer, true, true);
  const hor = Horizon(date, observer, eq.ra, eq.dec, 'normal');
  return { azimuth: hor.azimuth, altitude: hor.altitude };
}
