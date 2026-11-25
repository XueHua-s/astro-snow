import { describe, expect, it } from 'vitest';
import { forEachConnection } from '../src/components/ui/cover/particle-network';

const blue = { x: 0, y: 0, color: 0, opacity: 1 };
const pink = { x: 20, y: 0, color: 1, opacity: 1 };
const white = { x: 10, y: 18, color: 2, opacity: 1 };

function edges(...points: (typeof blue)[]) {
  const result = new Map<string, number>();
  forEachConnection(points, (a, b, opacity) => {
    const pair = [a.color, b.color].sort().join('-');
    expect(result.has(pair)).toBe(false);
    result.set(pair, opacity);
  });
  return result;
}

describe('cover particle encounters', () => {
  it('forms three-colour triangles regardless of input order and lets vertices drift out', () => {
    const triangle = edges(pink, blue, white);
    expect(triangle.size).toBe(3);
    expect(triangle).toEqual(edges(white, pink, blue));
    const open = edges(blue, pink, { ...white, x: 60 });
    expect([...open.keys()]).toEqual(['0-1', '1-2']);
    expect(open.get('1-2')).toBeLessThan(triangle.get('1-2')!);
  });

  it('omits distant, same-colour and transparent neighbours, also at equal x', () => {
    expect(edges(blue, { ...pink, y: 100 }).size).toBe(0);
    expect(edges(blue, { ...pink, x: 55 }).size).toBe(0);
    expect(edges(blue, { ...pink, color: blue.color }).size).toBe(0);
    expect(edges(blue, { ...pink, opacity: 0 }).size).toBe(0);
    const aligned = { ...pink, x: 0, y: 20 };
    expect(edges(blue, { ...aligned, opacity: 0.5 }).get('0-1')).toBeCloseTo(
      edges(blue, aligned).get('0-1')! / 2,
    );
  });
});
