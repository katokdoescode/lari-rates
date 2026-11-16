// Prints the CHANGELOG.md section for a version, followed by install hints.
// Usage: node scripts/release-notes.mjs 1.2.3
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <version>');
  process.exit(1);
}

const changelog = readFileSync(resolve(import.meta.dirname, '../CHANGELOG.md'), 'utf8');
const lines = changelog.split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no section for ${version} — add one before tagging.`);
  process.exit(1);
}
const length = lines.slice(start + 1).findIndex((line) => line.startsWith('## '));
const section = lines.slice(start + 1, length === -1 ? undefined : start + 1 + length);

console.log(`${section.join('\n').trim()}

### Downloads

| File | Browser |
| --- | --- |
| \`lari-rates-${version}-firefox.zip\` | Firefox (Manifest V2) |
| \`lari-rates-${version}-chrome.zip\` | Chrome, Brave, Vivaldi and other Chromium browsers (Manifest V3) |
| \`lari-rates-${version}-edge.zip\` | Microsoft Edge |
| \`lari-rates-${version}-opera.zip\` | Opera |
| \`lari-rates-${version}-sources.zip\` | Source archive for store review |

See the [README](https://github.com/katokdoescode/lari-rates#install) for how to install a build by hand.`);
