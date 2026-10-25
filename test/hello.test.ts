// Hello Quest, played: the example in docs/making-a-game.md does what the
// guide says it does.

import { afterEach, expect, spyOn, test, type Mock } from 'bun:test';
import { join } from 'node:path';
import { readGameData } from '@fq2js/engine/data';
import { ScriptContext } from '@fq2js/engine/script';
import { makeGameWith } from '@fq2js/engine/fixture';
import { screenText, typed, type Step } from '@fq2js/engine/testing';
import content, { start } from '../content.ts';

const data = (): ReturnType<typeof readGameData> => readGameData(join(import.meta.dir, '..', 'data'));
const keys = (key: Step, n: number): Step[] => Array.from({ length: n }, () => key);

let random: Mock<() => number> | null = null;
afterEach(() => {
    random?.mockRestore();
    random = null;
});

test('a new game: the name, the sign, the hut, the hermit and a potion', async () => {
    const { game, term } = makeGameWith(content, { ...data(), screensaver: false });
    term.feed(
        // New game, and the name.
        'enter',
        ...typed('Ada'),
        () => {
            expect(screenText(term.screen)).toContain('Hello, Ada!');
            return 'x';
        },
        // Down a row, then east to the sign, and bump into it.
        'down',
        ...keys('right', 10),
        () => {
            expect(screenText(term.screen)).toContain('beware of monsters to the east!');
            return 'up';
        },
        // Along under the hut to its door, and in.
        ...keys('right', 12),
        'up',
        () => {
            expect(game.playing).toMatchObject({ screen: 1000, x: 40, y: 19 });
            return 'up';
        },
        // Up to the hermit, who gives a potion.
        ...keys('up', 10),
        () => {
            expect(screenText(term.screen)).toContain('The hermit gives you a potion.');
            return 'x';
        },
        // The inventory has it, and drinking it uses it up.
        'i',
        () => {
            expect(screenText(term.screen)).toContain('Potion x1');
            return 'enter';
        },
        () => {
            expect(screenText(term.screen)).toContain('It tastes of mint.');
            return 'x';
        },
        'escape',
        'escape',
    );
    await game.run();
    expect(term.remaining).toBe(0);
    expect(game.playing).toMatchObject({ name: 'Ada', weapon: 'stick', items: { stick: 1 }, flags: { readSign: true, metHermit: true } });
});

test('the monsters of the wild field can be fought', async () => {
    random = spyOn(Math, 'random').mockReturnValue(0.99);
    const { game, term } = makeGameWith(content, { ...data(), player: structuredClone(start), steps: ['enter', 'x', 'x'] });
    const g = new ScriptContext(game);
    expect(await g.fight(g.monster('slime'))).toBe('won');
    expect(g.exp).toBe(5);
    expect(term.remaining).toBe(0);
});

test('screen 2, east of the meadow, has monsters', () => {
    const { world } = data();
    expect([world.name(1), world.name(2), world.name(1000)]).toEqual(['Hello Meadow', 'The Wild Field', "The Hermit's Hut"]);
    expect(world.hasMonsters(2)).toBe(true);
    expect(world.hasMonsters(1)).toBe(false);
});
