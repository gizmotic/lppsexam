/**
 * Build-time helper for the slim build (LANGUAGE_HELP=false): downloads the Chromium spellcheck dictionaries
 * (.bdic) into public/dictionaries/<lang>.bdic so the app can spellcheck offline.
 * Needs internet at BUILD time only. Never fails the build: without dictionaries Electron falls back to its own
 * (online) download at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'dictionaries');
const BASE = 'https://redirector.gvt1.com/edgedl/chrome/dict/';
// Chromium versions its dictionaries per language - try a few known version suffixes, newest first
const VERSIONS = ['10-1', '10-0', '9-0', '8-0', '7-1', '7-0', '6-1', '6-0', '5-0', '4-0', '3-1', '3-0'];
const LANGS = ['de-de', 'en-us', 'en-gb'];

fs.mkdirSync(OUT, { recursive: true });
for (const lang of LANGS) {
    const target = path.join(OUT, `${lang}.bdic`);
    if (fs.existsSync(target) && fs.statSync(target).size > 10000) { console.log(`dictionaries: ${lang} already present`); continue; }
    let ok = false;
    for (const v of VERSIONS) {
        try {
            const res = await fetch(`${BASE}${lang}-${v}.bdic`);
            if (!res.ok) continue;
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length < 10000 || buf.subarray(0, 4).toString('latin1') !== 'BDic') continue;   // sanity: bdic magic
            fs.writeFileSync(target, buf);
            console.log(`dictionaries: ${lang} (${v}) ${Math.round(buf.length / 1024)} KB`);
            ok = true; break;
        } catch (e) { /* try next */ }
    }
    if (!ok) console.warn(`⚠ dictionaries: could not download ${lang} - slim build will fall back to online download at runtime`);
}
