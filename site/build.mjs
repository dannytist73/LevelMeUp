// The public pages for levelmeup.dannytist.com (M13; Google Play needs a privacy policy and an account-deletion page on
// the web). Builds site/dist from site/pages: fills in the contact email (site/contact.json) and today's date.
// Refuses without an email, so a page with no way to reach us is never published. `--preview` builds with a visible
// "(email to come)" instead, for reading only.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const preview = process.argv.includes('--preview');
const { email } = JSON.parse(readFileSync(join(here, 'contact.json'), 'utf8'));
if (!preview && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email ?? '')) {
  console.error('site: set the contact email in site/contact.json first (the pages must say how to reach us).');
  process.exit(1);
}
const updated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Manila' });
const out = join(here, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const name of readdirSync(join(here, 'pages'))) {
  const from = join(here, 'pages', name);
  if (!name.endsWith('.html')) {
    copyFileSync(from, join(out, name));
    continue;
  }
  const html = readFileSync(from, 'utf8')
    .replaceAll('mailto:__CONTACT_EMAIL__', preview ? '#' : `mailto:${email}`)
    .replaceAll('__CONTACT_EMAIL__', preview ? '(email to come)' : email)
    .replaceAll('__UPDATED__', updated);
  if (html.includes('__')) throw new Error(`${name}: a placeholder is left`);
  writeFileSync(join(out, name), html);
}
console.log(`site: built ${readdirSync(out).length} files into site/dist${preview ? ' (preview, no email)' : ''}`);
