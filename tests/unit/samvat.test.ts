import { describe, expect, it } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { DELHI } from '../helpers';

describe('Samvat year boundary', () => {
  it('stays in the old Vikrama/Shaka year in early March', () => {
    const p = computePanchanga(new Date('2024-03-01T00:00:00+05:30'), DELHI);
    expect(p.samvat.vikrama).toBe(2080);
    expect(p.samvat.shaka).toBe(1945);
  });

  it('does not roll Vikrama/Shaka early before Chaitra Shukla Pratipada', () => {
    const p = computePanchanga(new Date('2024-04-08T00:00:00+05:30'), DELHI);
    expect(p.masa.amantaName).toBe('Phalguna');
    expect(p.samvat.vikrama).toBe(2080);
    expect(p.samvat.shaka).toBe(1945);
  });

  it('rolls Vikrama/Shaka on Chaitra Shukla Pratipada', () => {
    const p = computePanchanga(new Date('2024-04-09T00:00:00+05:30'), DELHI);
    expect(p.masa.amantaName).toBe('Chaitra');
    expect(p.samvat.vikrama).toBe(2081);
    expect(p.samvat.shaka).toBe(1946);
  });
});
