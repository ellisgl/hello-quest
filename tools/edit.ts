#!/usr/bin/env bun
// The level editor, on Hello Quest's maps:  bun tools/edit.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Terminal } from '@fq2ts/engine/terminal';
import { readConfig } from '@fq2ts/engine/game';
import { main } from '@fq2ts/tools/edit';
import { contentTriggers } from '@fq2ts/tools/game';
import content from '../content.ts';

const data = join(import.meta.dir, '..', 'data');
// (The editor's screen is the game's: config.json's size.)
const { screen } = readConfig(JSON.parse(readFileSync(join(data, 'config.json'), 'utf8')));
const term = new Terminal({ name: 'The level editor', size: screen });
term.onInterrupt = () => {
    term.stop();
    process.exit(130);
};

try {
    process.exit(await main(process.argv.slice(2), { maps: join(data, 'maps'), screen, triggers: contentTriggers(content) }, term));
} catch (error) {
    term.stop();
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
