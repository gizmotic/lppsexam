// Builds dist-page/: the production build with binary assets renamed to .wasm, for hosts that do not serve .bin.
//   node tools/build-page.mjs        -> prints the file list as JSON (as/path pairs)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..'), out = path.join(root, 'dist-page');
execSync('npx vite build --outDir dist-page --emptyOutDir', { cwd: root, env: { ...process.env, VITE_BIN_EXT: 'wasm' }, stdio: 'ignore' });
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    let p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (p.endsWith('.bin')) { const q = p.replace(/\.bin$/, '.wasm'); fs.renameSync(p, q); p = q; }
    // bundled previews that the app no longer shows
    if (/thumbs\/(eyebrow|eyelash|teeth|tongue|Eyelash)/.test(p)) { fs.rmSync(p); continue; }
    files.push({ as: path.relative(out, p).replace(/\\/g, '/'), path: p });
  }
})(out);
fs.writeFileSync(path.join(root, 'dist-page', 'files.json'), JSON.stringify(files));
console.log(files.length, 'files', (files.reduce((s, f) => s + fs.statSync(f.path).size, 0) / 1e6).toFixed(1), 'MB');
