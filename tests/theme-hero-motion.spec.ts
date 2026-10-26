import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const page = readFileSync(
  new URL('../src/pages/index.astro', import.meta.url),
  'utf8',
);
const script = page.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Hero preference controller is missing');

function createHero({ reduced = false, coarse = false } = {}) {
  const preferences = [
    { matches: reduced, listeners: new Set<() => void>() },
    { matches: coarse, listeners: new Set<() => void>() },
  ];
  const properties = new Map<string, string>();
  const events = new Map<
    string,
    (event: { clientX: number; clientY: number }) => void
  >();
  const frames = new Map<number, () => void>();
  let frameId = 0;
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const cancel = vi.fn((id: number) => frames.delete(id));
  runInNewContext(script!, {
    document: {
      querySelector: () => ({
        querySelector: () => ({
          style: {
            setProperty: (name: string, value: string) =>
              properties.set(name, value),
            removeProperty: (name: string) => properties.delete(name),
          },
        }),
        getBoundingClientRect: () => rect,
        addEventListener: (
          type: string,
          listener: (event: { clientX: number; clientY: number }) => void,
        ) => events.set(type, listener),
      }),
    },
    window: {
      matchMedia: (query: string) => {
        const preference = preferences[query.includes('motion') ? 0 : 1];
        return {
          get matches() {
            return preference.matches;
          },
          addEventListener: (_type: string, listener: () => void) =>
            preference.listeners.add(listener),
        };
      },
    },
    requestAnimationFrame: (paint: () => void) => {
      frames.set(++frameId, paint);
      return frameId;
    },
    cancelAnimationFrame: cancel,
  });
  return {
    properties,
    frames,
    rect,
    cancel,
    move: (x = 40, y = 30) =>
      events.get('pointermove')!({ clientX: x, clientY: y }),
    leave: () => events.get('pointerleave')!({ clientX: 0, clientY: 0 }),
    preference: (index: number, matches: boolean, notify = true) => {
      preferences[index].matches = matches;
      if (notify)
        preferences[index].listeners.forEach((listener) => listener());
    },
    flush: () => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((paint) => paint());
    },
  };
}

describe('hero live motion preferences', () => {
  it('batches movement and restores the resting highlight on pointer leave', () => {
    const hero = createHero();
    hero.move();
    hero.move(120, 70);
    expect(hero.frames.size).toBe(1);
    hero.flush();
    expect(Object.fromEntries(hero.properties)).toEqual({
      '--sheen-x': '60%',
      '--sheen-y': '70%',
    });
    hero.leave();
    hero.flush();
    expect(Object.fromEntries(hero.properties)).toEqual({
      '--sheen-x': '50%',
      '--sheen-y': '0%',
    });
  });

  it.each([0, 1])(
    'cancels queued paint and resets when preference %s disables motion',
    (index) => {
      const hero = createHero();
      hero.move();
      hero.flush();
      expect(hero.properties.size).toBe(2);
      hero.move(150, 90);
      expect(hero.frames.size).toBe(1);
      const stalePaint = [...hero.frames.values()][0];
      hero.preference(index, true);
      expect(hero.cancel).toHaveBeenCalledTimes(1);
      expect(hero.frames.size).toBe(0);
      expect(hero.properties.size).toBe(0);
      // Even a callback already delivered by the browser must recheck the MQ.
      stalePaint();
      hero.move();
      hero.leave();
      expect(hero.frames.size).toBe(0);
      expect(hero.properties.size).toBe(0);
      hero.preference(index, false);
      hero.move();
      hero.flush();
      expect(hero.properties.get('--sheen-x')).toBe('20%');
    },
  );

  it('rechecks the preference before paint even if the change event is delayed', () => {
    const hero = createHero();
    hero.move();
    hero.preference(0, true, false);
    hero.flush();
    expect(hero.properties.size).toBe(0);
  });

  it.each([{ reduced: true }, { coarse: true }])(
    'starts disabled and can resume for %o',
    (initial) => {
      const hero = createHero(initial);
      hero.move();
      hero.leave();
      expect(hero.frames.size).toBe(0);
      hero.preference(0, false);
      hero.preference(1, false);
      hero.move();
      hero.flush();
      expect(hero.properties.get('--sheen-y')).toBe('30%');
    },
  );

  it('ignores zero-sized heroes and missing markup', () => {
    const hero = createHero();
    hero.rect.width = 0;
    hero.move();
    expect(hero.frames.size).toBe(0);
    for (const element of [null, { querySelector: () => null }]) {
      expect(() => {
        runInNewContext(script, {
          document: { querySelector: () => element },
        });
      }).not.toThrow();
    }
  });
});
