# Making a game

The engine under Final Quest 2 (`@fq2js/engine`) can run other games of the
same kind: a hero walking around screens of coloured characters, scripts
that run when they step on things, shops, items and fights, all in an
80x25 terminal. This guide makes one from nothing.

Its worked example is **Hello Quest**, in [games/hello/](../games/hello/):
three screens, a sign, a hermit with a potion, and monsters in a field.
It's the smallest whole game, and it's tested, so everything shown here
works. Play it first:

```sh
bun games/hello/hello.ts
```

## What a game is

A game is three things:

- **Data** ([data/](../games/hello/data/)): JSON files for the screens,
  items, monsters and a few settings. No code.
- **Content** ([content.ts](../games/hello/content.ts)): TypeScript for
  everything that happens: the title screen, the opening, what each trigger
  does, the status line. Scripts are `async` functions given `g`, the
  script API.
- **An entry point** ([hello.ts](../games/hello/hello.ts)): reads the data,
  makes a `Game` and runs it.

The engine does the rest: drawing, walking between screens, the title menu,
saving and loading, random fights, messages, the world map, the help and
back-buffer screens.

## Setting up

Make a folder in `games/` (the repository's workspace picks it up) with a
`package.json`:

```json
{
  "name": "hello-quest",
  "private": true,
  "type": "module",
  "dependencies": {
    "@fq2js/engine": "workspace:*",
    "@fq2js/tools": "workspace:*"
  }
}
```

then run `bun install`. `@fq2js/tools` is only for the level editor.

## The world

The world is a grid of **screens**, 80 across and 24 down. A screen's
number is its place on the grid, so screen n's neighbours are n-1 and n+1
(west and east) and n-80 and n+80 (north and south); walking off the edge
of one screen takes the player onto the next, if there is one. Each screen
is 79x22 cells; the rows below it are the status bar.

Hello Quest has screen 1 (the meadow), screen 2 east of it (a wild field)
and screen 1000, the inside of the hermit's hut. Interiors are reached by
scripts (a door's trigger), but walking off an edge goes to the
neighbouring number whatever its kind, so give interiors numbers away from
the outdoor screens, as 1000 is.

Each screen is a file in `data/maps/`, `0001.json` for screen 1:

```json
{
  "screen": 1,
  "name": "Hello Meadow",
  "kind": 1,
  "tiles":   ["♣♣♣♣♣...", ...],
  "fg":      ["AAAAA...", ...],
  "bg":      ["22222...", ...],
  "solid":   ["#####...", ...],
  "terrain": ["fffff...", ...]
}
```

Every grid has 22 rows of 79 characters:

- **tiles**: what's drawn, any character one column wide (letters, box
  drawing, symbols...).
- **fg** and **bg**: the colours, one hex digit each; backgrounds 0 to 7
  only. The 16 colours, 0 to F: black, blue, green, cyan, red, magenta,
  brown, gray, darkgray, lightblue, lightgreen, lightcyan, lightred,
  lightmagenta, yellow, white.
- **solid**: `#` can't be walked through, `.` can.
- **terrain**: `.` grass, `f` forest, `m` mountain, `w` water, `r` road,
  `_` floor, `#` structure.
- **kind**: 0 water, 1 land, 2 interior, 3 town, 4 small town; 5 to 8 are
  land, small town, town and water *with random monsters*.
- **name** (optional) is shown when the player arrives;
  **encounters** (optional) names the monster table used there.

Don't write these by hand: use the level editor. Copy Hello Quest's
[tools/edit.ts](../games/hello/tools/edit.ts), which runs the editor on
the game's maps (and marks the content's trigger tiles), and run it:

```sh
bun games/hello/tools/edit.ts
```

The editor opens on the world grid: N makes a new screen of a kind, Enter
edits one, and ? lists its keys. (The map viewer and generator in
`@fq2js/tools` work the same way; see
[games/fq2/tools/](../games/fq2/tools/).)

## The data

**config.json** names the game. `title` and `version` show on the title
screen if the content puts them there; `superhumanFactor` multiplies the
player's damage when they turn superhuman (a cheat in Final Quest 2).

```json
{ "title": "Hello Quest", "company": "You", "companyShort": "You", "version": "V1.0", "revision": "Rev A", "superhumanFactor": 3 }
```

**items.json** is the item catalogue:

```json
[
  { "id": "stick", "name": "Stick", "kind": "weapon", "power": 10, "value": 5, "description": "Better than nothing." },
  { "id": "potion", "name": "Potion", "kind": "usable", "value": 20, "effect": { "heal": 30 },
    "useText": "You drink the potion. It tastes of mint.", "description": "Heals 30 hitpoints." }
]
```

`kind` is `weapon`, `armour`, `usable`, `quest` or `misc`. Weapons and
armour add their `power` in fights and can have a `breakChance`. Usable
items have an `effect` (`heal`, `maxHp`, `strength`, `defense`). `value`
is the price in shops, and quest items can't be sold.

**monsters.json** has the monsters, and the tables random fights pick
them from:

```json
{
  "monsters": [
    { "id": "slime", "name": "Slime", "says": "Blorp.", "hp": 8, "gold": 3, "exp": 5,
      "attacks": [{ "text": "oozes on you", "power": 4 }] }
  ],
  "tables": [
    { "name": "default", "chance": 20, "monsters": ["slime", "bat"] }
  ]
}
```

On a screen with monsters, each step on wild ground (grass, forest,
mountain) has a 1 in `chance` of a fight, against a monster from the
screen's table (`default` unless the map names another). A table can have
`tiers`, so that weaker players only meet the first few monsters; a monster
can have `defense`, a `kill` line, a `pronoun` and `after` hooks that run
an event when the fight ends (see Events below).

## The content

[content.ts](../games/hello/content.ts) exports one object, the game's
`Content`. Its type, `Content<Flags>`, checks that nothing is missing.

### Flags and the start player

Flags are what scripts remember: whether the sign was read, whether the
hermit was met. Each is true or false, a number or a string, and they're
saved with the player. Declare them as a type, so a misspelled flag is a
compile error:

```ts
export type Flags = {
    readSign: boolean;
    metHermit: boolean;
};
```

The start player is the player of a new game: where they stand, their
hitpoints, gold and stats, what they carry, and every flag's first value.
`monsters: true` turns random fights on.

```ts
export const start: Player<Flags> = {
    name: '', sex: 'male',
    screen: 1, x: 10, y: 11, mapScreen: 1,
    hp: 50, maxHp: 50, gold: 10, strength: 10, defense: 5, exp: 0,
    items: {}, weapon: null, armour: null,
    monsters: true, superhuman: false,
    flags: { readSign: false, metHermit: false },
};
```

### The screens around the game

- **title**: `art` draws the title screen; `menu` places its options. The
  engine's title menu has six options in a fixed order (new game, save,
  load, help, resume, leave): the content gives their labels, positions and
  colours, not what they do.
- **help** and **credits**: lines of text for the help screen and the
  goodbye screen.
- **worldMapLegend**: lines drawn over the world map (M).
- **statusLine**: the bottom line while exploring, from the player.

These are written in the engine's **text markup**, which is how all the
game's text gets its colours and places:

| Markup | |
|---|---|
| `{yellow}` | foreground colour (any of the 16 names) |
| `{blink red}` | blinking foreground |
| `{on blue}` | background colour (the first 8) |
| `{x 27}` `{y 5}` | move to a column or row |
| `{sp 10}` | ten spaces in the current colours |
| `{center}` | centre the rest of the line |
| `{{` | a literal `{` |

Anything the player typed (their name, say) should go through
`escapeMarkup`, so a `{` in it is shown, not read as markup.

### The opening and the inventory

`newGame` runs when a new game starts, before the player sees the map;
`inventory` runs on I (or V). Both are scripts:

```ts
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
```

### Screens and triggers

`screens` gives scripts for each screen, by number:

```ts
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
```

- **`at`** scripts are triggers: they run when the player steps onto the
  tile, bumps into it (if it's solid, like the sign and the hermit), or
  arrives on it from another screen.
- **`show`** runs every time the screen is drawn: for things drawn over
  the map, like a character who's only there sometimes.

What a trigger does decides what happens to the step:

- `g.write(text)` shows a message in the status bar; the player carries
  on walking. That's the sign.
- `g.cls()` and `g.print(...)` take over the screen, for a scene or a
  conversation; the map comes back when the script ends. That's the
  hermit.
- `g.goto(screen, x, y)` sends the player elsewhere once the script ends,
  and runs any trigger where they arrive. That's the hut's doors.
- `g.moveTo(x, y)` moves them on the same screen.

```ts
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
```

### Events

`events` are scripts that monsters run after a fight: a monster with
`"after": { "won": "dragon-slain" }` runs the content's `dragon-slain`
event when the player beats it (`lost` and `fled` work the same way). The
game won't start if a monster names an event that doesn't exist.

### upgradeSave

If a new version of the game changes what's in a save (a flag becomes an
item, say), `upgradeSave(saved, player)` is given the save as it was on
disk, to carry things over. Saves otherwise look after themselves: flags
and items the game no longer has are dropped, new flags start at their
first value, and a player on a screen that's gone starts again at the
start.

## Scripts: the `g` API

Every script gets `g` (a `ScriptContext`; see
[script.ts](../packages/engine/src/script.ts) for all of it).

| | |
|---|---|
| **The player** | `g.name`, `g.sex`, `g.bySex('boy', 'girl')`, `g.hp`, `g.maxHp`, `g.gold`, `g.strength`, `g.defense`, `g.exp` (all settable, and kept in range), `g.healFull()`, `g.flags` |
| **Where** | `g.screenNumber`, `g.x`, `g.y`, `g.moveTo(x, y)`, `g.goto(screen, x, y)` |
| **Text** | `g.write(text)` (status bar), `g.cls()`, `g.print(...lines)`, `g.overlay(text)` (over the map), `g.scroll(lines, title)` |
| **Input** | `await g.key()`, `await g.choice(options)` (the index picked, -1 on Escape), `await g.input({ x, y, length })`, `await g.ask(...)` (the same, but null on Escape), `await g.askLine(question)` (on the status bar, leaving the map as it is), `await g.number(...)` |
| **Items** | `g.give(id, n)`, `g.take(id, n)`, `g.count(id)`, `g.has(id, n)`, `g.equip(id)`, `g.unequip(slot)`, `g.use(id)`, `g.inventory`, `g.weapon`, `g.armour` |
| **Money and shops** | `await g.spend(amount)` (false if they can't), `await g.buy(ids)`, `await g.sell()` |
| **Fights** | `g.monster(id)`, `await g.fight(monster)` (`'won'`, `'lost'` or `'fled'`) |
| **Other** | `g.random(n)` (1 to n), `await g.sleep(seconds)`, `await g.animate(delay, path)` |

Scripts can be `async`: `await` everything that waits for the player.

## The entry point

[hello.ts](../games/hello/hello.ts) reads the data folder, adds any mods,
makes the `Game` and runs it:

```ts
const { config, ...data } = readGameData(join(import.meta.dir, 'data'));
game = new Game({
    term: new Terminal({ name: config.title }),
    config,
    ...applyMods({ content, ...data }, await loadMods(modsDir)),
    saves: new Saves(join(import.meta.dir, 'saves')),
});
```

Everything is read and checked before the terminal is taken over, so a
mistake in a data file is a plain message (`items.json[1].effect: a usable
item needs an effect`), not a garbled screen. `Saves` keeps the save slots
in a folder; `debug: true` adds S, the settings editor, on the title screen
and while exploring.

## Testing the game

[`@fq2js/engine/testing`](../packages/engine/src/testing.ts) has a
`FakeTerminal` that plays back keys instead of reading the keyboard, so a
whole game can be played from a test. A step can also be a function, to
look at the screen at that moment:

```ts
import { makeGameWith } from '@fq2js/engine/fixture';
import { screenText, typed } from '@fq2js/engine/testing';

const { game, term } = makeGameWith(content, { ...readGameData(dataDir), screensaver: false });
term.feed(
    'enter',               // New game
    ...typed('Ada'),       // the name, and Enter
    () => {
        expect(screenText(term.screen)).toContain('Hello, Ada!');
        return 'x';
    },
    'escape', 'escape',    // back to the title menu, and Leave
);
await game.run();
expect(game.playing.name).toBe('Ada');
```

[games/hello/test/hello.test.ts](../games/hello/test/hello.test.ts) plays
Hello Quest from the opening to the hermit's potion this way.

## Multiplayer and mods

The same content runs on the multiplayer server, over telnet, SSH and the
web, with accounts and saves in a database. A game's server is a few lines
(see [games/fq2/server.ts](../games/fq2/server.ts)):

```ts
await runServer({ content, name: 'Hello Quest', gameData: join(import.meta.dir, 'data') });
```

Two things to know for it: a player's name comes from their account, so
`newGame` shouldn't ask again if `g.name` is already set (Hello Quest
doesn't), and the screensaver is off.

Games load mods with `loadMods` and `applyMods`, as hello.ts does; see
[mods.md](mods.md) for writing them.

## What the engine doesn't do (yet)

- The screen is 80x25 and 16 colours.
- The title menu's six options and their order are fixed.
- The keys while exploring are fixed: arrows (or 8 4 6 2) to walk, I or V,
  M, B, R, ? and Escape.
