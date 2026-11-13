/**
 * Built-in (Chromium/Electron) spellchecker for the slim build "ohne Sprachhilfe".
 *
 * Electron downloads Hunspell dictionaries (.bdic) from a Google CDN on first use - not an option during an
 * offline exam. We therefore bundle the dictionaries in public/dictionaries/<lang>.bdic (fetched at build time by
 * scripts/fetch-dictionaries.mjs) and serve them from a tiny loopback HTTP server that Electron is pointed to.
 * Matching is done by language prefix, so the exact Chromium dictionary version number does not matter.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import log from 'electron-log';
import platformDispatcher from './platformDispatcher.js';

const SUPPORTED = ['de-DE', 'en-US', 'en-GB'];
let server = null;

function dictDir() {
    return path.join(platformDispatcher.publicBase, 'dictionaries');
}

/** Maps any exam language (de-AT, en-AU, ...) to a bundled dictionary language. */
export function mapSpellcheckLanguage(lang) {
    const l = String(lang || 'de-DE').toLowerCase();
    if (l.startsWith('de')) return 'de-DE';
    if (l === 'en-gb' || l === 'en-au' || l === 'en-nz' || l === 'en-za') return 'en-GB';
    if (l.startsWith('en')) return 'en-US';
    return 'de-DE';
}

function startDictionaryServer() {
    return new Promise((resolve, reject) => {
        const srv = http.createServer((req, res) => {
            // request looks like /de-de-3-0.bdic or /en-US-10-1.bdic
            const name = path.basename(String(req.url || '').split('?')[0]).toLowerCase();
            const m = /^([a-z]{2}-[a-z]{2})-/.exec(name);
            const file = m ? path.join(dictDir(), `${m[1]}.bdic`) : null;
            if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        });
        srv.on('error', reject);
        srv.listen(0, '127.0.0.1', () => resolve(srv));   // random free port, loopback only
    });
}

/** Call once after app ready (slim build only). */
export async function setupNativeSpellcheck(ses) {
    try {
        const available = SUPPORTED.filter((l) => fs.existsSync(path.join(dictDir(), `${l.toLowerCase()}.bdic`)));
        if (!available.length) {
            log.warn('spellcheck @ setup: no bundled dictionaries found (public/dictionaries) - Electron falls back to its online download');
        } else {
            server = await startDictionaryServer();
            ses.setSpellCheckerDictionaryDownloadURL(`http://127.0.0.1:${server.address().port}/`);
        }
        ses.setSpellCheckerEnabled(true);
        ses.setSpellCheckerLanguages(['de-DE']);
        log.info(`spellcheck @ setup: bundled dictionaries: ${available.join(', ') || 'none'}`);
    } catch (e) {
        log.warn('spellcheck @ setup failed', e);
    }
}

/** Switches the active dictionary (called from the editor with the exam's spellcheck language). */
export function setSpellcheckLanguage(ses, lang) {
    try {
        const target = mapSpellcheckLanguage(lang);
        ses.setSpellCheckerLanguages([target]);
        return target;
    } catch (e) {
        log.warn('spellcheck @ setSpellcheckLanguage failed', e);
        return null;
    }
}

export function stopDictionaryServer() {
    try { server?.close(); } catch (e) { /* ignore */ }
    server = null;
}
