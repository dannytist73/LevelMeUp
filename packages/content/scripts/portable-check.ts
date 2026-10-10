// Imports the content package the way Deno and Hermes will see it: native ESM, explicit .ts extensions, types erased.
import * as content from '../src/index.ts';

console.log(`content portable: ok (${Object.keys(content).length} exports)`);
