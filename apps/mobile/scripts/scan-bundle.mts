// npm run check:bundle — exports the Android JavaScript bundle a build compiles, and fails if it holds any secret
// (architecture §8). It scans the JS before Hermes compiles it (--no-bytecode): the bytecode packs strings with no
// separators, which makes unrelated neighbours look like keys. Prints at most the first 8 characters of a finding.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { findSecrets } from './scan.ts';

const app = join(import.meta.dirname, '..');
const out = mkdtempSync(join(tmpdir(), 'lmu-bundle-'));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

try {
  const exported = spawnSync('npx', ['expo', 'export', '--platform', 'android', '--no-bytecode', '--output-dir', out], { cwd: app, stdio: 'inherit', shell: true });
  if (exported.status !== 0) throw new Error('expo export failed');
  let found = 0;
  const all = files(out);
  for (const file of all) {
    for (const hit of findSecrets(readFileSync(file, 'latin1'))) {
      found++;
      console.error(`${relative(out, file)}: ${hit.kind} (${hit.sample})`);
    }
  }
  if (found > 0) {
    console.error(`The app bundle holds ${found} secret(s). Nothing secret may ship in the app.`);
    process.exitCode = 1;
  } else {
    console.log(`Bundle scan: ${all.length} files, no secrets.`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
