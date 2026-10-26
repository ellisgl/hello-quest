#!/usr/bin/env bun
// The level editor, on Hello Quest's maps:  bun games/hello/tools/edit.ts

import { join } from 'node:path';
import { Terminal } from '@fq2ts/engine/terminal';
import { main } from '@fq2ts/tools/edit';
import { contentTriggers } from '@fq2ts/tools/game';
import content from '../content.ts';

const term = new Terminal({ name: 'The level editor' });
term.onInterrupt = () => {
    term.stop();
    process.exit(130);
};

try {
    process.exit(await main(process.argv.slice(2), { maps: join(import.meta.dir, '..', 'data', 'maps'), triggers: contentTriggers(content) }, term));
} catch (error) {
    term.stop();
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
