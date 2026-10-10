// Imports the package the way Deno and Hermes will see it: native ESM, explicit .ts extensions, types erased.
import * as rules from '../src/index.ts';

console.log(`portable: ok (${Object.keys(rules).length} exports)`);
