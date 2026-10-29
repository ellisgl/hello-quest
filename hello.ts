#!/usr/bin/env bun
// Hello Quest -- run with:  bun hello.ts [--mods DIR] [--enable-mods LIST]
//
// The mods in LIST (folders' names, with commas between) come from DIR, or
// the mods folder here. None are added unless they're listed.

import { join, resolve } from 'node:path';
import { Terminal } from '@fq2ts/engine/terminal';
import { Saves } from '@fq2ts/engine/saves';
import { Game } from '@fq2ts/engine/game';
import { readGameData } from '@fq2ts/engine/data';
import { applyMods, loadMods, readModList } from '@fq2ts/engine/mods';
import content, { type Flags } from './content.ts';

// Stops with a plain message (a bad data file, a terminal too small...).
function fail(error: unknown): never {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}

const args = process.argv.slice(2);
const modsAt = args.indexOf('--mods');
const modsDir = resolve(modsAt >= 0 ? (args[modsAt + 1] ?? 'mods') : join(import.meta.dir, 'mods'));
const enableAt = args.indexOf('--enable-mods');
const enabledMods = enableAt >= 0 ? args[enableAt + 1] : undefined;

// The data and mods are read (and checked) before the game takes over the
// terminal, so that any error is readable.
let game: Game<Flags>;
try {
    const { config, ...data } = readGameData(join(import.meta.dir, 'data'));
    game = new Game({
        term: new Terminal({ name: config.title }),
        config,
        ...applyMods({ content, ...data }, await loadMods(modsDir, readModList(enabledMods, '--enable-mods'))),
        saves: new Saves(join(import.meta.dir, 'saves')),
    });
} catch (error) {
    fail(error);
}

const { term } = game;
term.onInterrupt = () => {
    term.stop();
    process.exit(130);
};

try {
    term.start();
} catch (error) {
    fail(error);
}

try {
    await game.run();
} finally {
    term.stop();
}
