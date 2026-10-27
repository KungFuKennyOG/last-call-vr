// Smoke tests: open every page in headless Chromium (desktop mode, no headset) and fail on uncaught errors.
//   npx playwright install chromium   (once)
//   npm run smoke
// Screenshots land in tests/smoke/out/ so a change can be looked at without a headset.
// Needs internet: three.js loads from the jsDelivr CDN. If the CDN can't be reached, the tests are skipped, not failed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from '../../tools/serve.mjs';

// Add every new page here. `ready` is an optional global the page sets once it has booted.
const PAGES = [
  { name: 'boot', path: '/dev/boot.html', ready: '__bootOK' },
  { name: 'last-call', path: '/index.html' },
  { name: 'showdowns', path: '/showdowns/index.html' },
  { name: 'campaign-redirect', path: '/campaign/' }, // old Showdowns link: should land on showdowns/
];
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js';
const OUT = new URL('./out/', import.meta.url);

let server, browser, cdnReachable = true;

before(async () => {
  await mkdir(OUT, { recursive: true });
  server = await startServer(0);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext();
  try { cdnReachable = (await ctx.request.get(THREE_URL, { timeout: 8000 })).ok(); } catch { cdnReachable = false; }
  await ctx.close();
});

after(async () => { await browser?.close(); await server?.close(); });

for (const p of PAGES) {
  test(`${p.name} loads without errors`, async t => {
    if (!cdnReachable) { t.skip('three.js CDN unreachable from this machine'); return; }
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [], consoleErrors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('requestfailed', r => { if (/\.(m?js|html)$/.test(new URL(r.url()).pathname)) errors.push(`failed to load ${r.url()}`); });
    await page.goto(server.url + p.path, { waitUntil: 'load' });
    if (p.ready) await page.waitForFunction(name => window[name] === true, p.ready, { timeout: 10000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: new URL(`${p.name}.png`, OUT).pathname });
    if (consoleErrors.length) t.diagnostic(`console errors: ${consoleErrors.join(' | ')}`);
    await page.close();
    assert.deepEqual(errors, [], `uncaught errors on ${p.path}`);
  });
}
