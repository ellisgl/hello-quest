// Hello Quest's content: everything that makes it this game, as opposed to
// the engine. (docs/making-a-game.md walks through it.)

import type { Content } from '@fq2js/engine/game';
import type { Player } from '@fq2js/engine/player';
import type { ScriptContext } from '@fq2js/engine/script';
import { escapeMarkup } from '@fq2js/engine/text';

// What the scripts remember about what's happened. (A type alias, not an
// interface, so that it fits the engine's FlagRecord.)
export type Flags = {
    readSign: boolean;
    metHermit: boolean;
};

// What every script is given.
type G = ScriptContext<Flags>;

// The player at the start of a new game.
export const start: Player<Flags> = {
    name: '',
    sex: 'male',
    screen: 1,
    x: 10,
    y: 11,
    mapScreen: 1,
    hp: 50,
    maxHp: 50,
    gold: 10,
    strength: 10,
    defense: 5,
    exp: 0,
    items: {},
    weapon: null,
    armour: null,
    monsters: true,
    superhuman: false,
    flags: { readSign: false, metHermit: false },
};

async function newGame(g: G): Promise<void> {
    g.cls();
    // (On a server the player already has a name: their account's.)
    if (!g.name) {
        g.print('{lightgreen}What is your name?');
        while (!g.name) {
            g.name = await g.input({ x: 1, y: 2, length: 21 });
        }
    }

    g.give('stick');
    g.equip('stick');
    g.cls();
    g.print(`{white}Hello, ${escapeMarkup(g.name)}!`, '', '{green}You pick up a stick, and step out into the meadow.', '', '{gray}Press any key...');
    await g.key();
}

// The inventory screen (I): what the player carries, and a potion to drink.
async function inventory(g: G): Promise<void> {
    g.cls();
    g.print('{yellow}What you carry', '');
    for (const { item, count } of g.inventory) {
        g.print(`{white}${item.name} {gray}x${count}  ${item.description}`);
    }
    if (!g.inventory.length) {
        g.print('{gray}Nothing but pocket lint.');
    }
    g.print('');

    if (!g.has('potion')) {
        g.print('{gray}Press any key...');
        await g.key();
    } else if ((await g.choice(['Drink a potion', 'Close'])) === 0) {
        g.print('', `{lightgreen}${g.use('potion')}`);
        await g.key();
    }
}

// Screen 1's sign (a solid tile: bumping into it reads it).
function sign(g: G): void {
    g.write(g.flags.readSign ? 'The sign still says: monsters to the east.' : 'The sign says: beware of monsters to the east!');
    g.flags.readSign = true;
}

// The hermit, inside the hut (screen 1000).
async function hermit(g: G): Promise<void> {
    if (g.flags.metHermit) {
        g.write('The hermit is asleep.');
        return;
    }

    g.cls();
    g.print('{lightcyan}"Visitors! Take this, you look like you\'ll need it."', '', '{white}The hermit gives you a potion.', '', '{gray}Press any key...');
    g.give('potion');
    g.flags.metHermit = true;
    await g.key();
}

const content: Content<Flags> = {
    title: {
        art: ({ title, version, revision }) => [
            `{y 6}{center}{yellow}${title}`,
            `{y 8}{center}{gray}${version} ${revision}`,
            '{y 16}{x 32}{on blue}{sp 18}',
        ],
        // The six options, in the order the engine runs them: new game,
        // save, load, help, resume, leave. Each is [label, x, y].
        menu: {
            options: [
                ['New game', 36, 17],
                ['Save game', 36, 18],
                ['Load game', 36, 19],
                ['Help', 38, 20],
                ['Resume', 37, 21],
                ['Leave', 38, 22],
            ],
            selectedColor: [14, 1],
            color: [7, 1],
        },
    },
    help: ({ title }) => [`{y 2}{center}{yellow}${title}`, '{y 4}{x 20}{white}Arrows walk.  I: inventory.  M: map.  ?: all the keys.', '{y 23}{center}{gray}Press any key...'],
    credits: ({ title }) => [`{y 12}{center}{white}Thanks for playing ${title}!`],
    worldMapLegend: ['{x 30}{y 3}{white}{on blue}The world of Hello Quest'],
    statusLine: (p) => `${escapeMarkup(p.name)}   HP ${p.hp}/${p.maxHp}   Gold ${p.gold}   Exp ${p.exp}`,
    inventory,
    newGame,
    start,
    // Nothing is shared between players.
    world: {},
    screens: {
        1: {
            at: {
                '20,12': sign,
                '31,10': (g) => {
                    g.goto(1000, 40, 19);
                },
            },
        },
        1000: {
            at: {
                '40,8': hermit,
                '40,20': (g) => {
                    g.goto(1, 31, 11);
                },
            },
        },
    },
};

export default content;
