import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from '../scripts/build-seo.mjs';
import { checkLiveSite } from '../scripts/check-live-seo.mjs';

const baseUrl = 'https://seo-check.example';
const data = { products: {
  'boot-1': { name: 'Crampons <Sport> & "Co"', price: 129, stock: 4, category: 'Chaussures', sizes: ['42'], colors: ['Noir'], image: 'https://res.cloudinary.com/demo/image/upload/v1/boot.png' },
  'boot-2': { name: 'Crampons épuisés', price: 99.5, stock: 0, category: 'Chaussures' },
  'boot-3': { name: 'Stock à confirmer', price: 80, category: 'Chaussures' }
}, settings: { phone: '+216 12345678' } };

async function fixture(t, value = data, canonicalBase = baseUrl) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sportifano-live-check-'));
  const outDir = path.join(directory, 'site');
  t.after(() => rm(directory, { recursive: true, force: true }));
  await buildSite({ data: value, outDir, baseUrl: canonicalBase });
  return async (url) => {
    const pathname = new URL(url).pathname;
    const filename = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    try { return new Response(await readFile(path.join(outDir, decodeURIComponent(filename))), { status: 200 }); }
    catch { return new Response('Missing', { status: 404 }); }
  };
}

test('checks generated HTML, real catalog names, prices, stock, links and administrator exclusion', async t => {
  const fetchImpl = await fixture(t);
  const result = await checkLiveSite({ baseUrl, fetchImpl, attempts: 1 });
  assert.equal(result.status, 'passed');
  assert.equal(result.checkedProducts, 3);
  assert.equal(result.checkedCategories, 1);
  assert.equal(result.publishedProducts, 3);
  assert.equal(result.emptyCatalog, false);
});

test('a genuinely empty catalog is checked and reported without inventing products', async t => {
  const fetchImpl = await fixture(t, { products: null, settings: {} });
  const result = await checkLiveSite({ baseUrl, fetchImpl, attempts: 1 });
  assert.equal(result.publishedProducts, 0);
  assert.equal(result.checkedProducts, 0);
  assert.equal(result.emptyCatalog, true);
});

test('rejects incorrect canonical instead of accepting an HTTP-200 fallback page', async t => {
  const original = await fixture(t);
  await assert.rejects(checkLiveSite({ baseUrl, attempts: 1, fetchImpl: async url => {
    const response = await original(url);
    if (url.endsWith('/produits/boot-1/')) return new Response((await response.text()).replace('rel="canonical" href="https://seo-check.example/produits/boot-1/"', 'rel="canonical" href="https://seo-check.example/"'));
    return response;
  } }), /canonical/);
});

test('rejects price schema inconsistent with the published snapshot', async t => {
  const original = await fixture(t);
  await assert.rejects(checkLiveSite({ baseUrl, attempts: 1, fetchImpl: async url => {
    const response = await original(url);
    if (url.endsWith('/produits/boot-1/')) return new Response((await response.text()).replace('"price":"129.000"', '"price":"1.000"'));
    return response;
  } }), /prix ou devise/);
});

test('retries a transient CDN 404 and then verifies the complete fresh site', async t => {
  const original = await fixture(t);
  let stale = true;
  const result = await checkLiveSite({ baseUrl, attempts: 3, retryDelayMs: 0, fetchImpl: async url => {
    if (url.endsWith('/sitemap.xml') && stale) { stale = false; return new Response('Stale deployment', { status: 404 }); }
    return original(url);
  } });
  assert.equal(result.attempt, 2);
});

test('rejects an administrator URL in the public sitemap', async t => {
  const original = await fixture(t);
  await assert.rejects(checkLiveSite({ baseUrl, attempts: 1, fetchImpl: async url => {
    const response = await original(url);
    if (url.endsWith('/sitemap.xml')) return new Response((await response.text()).replace('</urlset>', '<url><loc>https://seo-check.example/admin.html</loc></url></urlset>'));
    return response;
  } }), /administrateur/);
});

test('requires the expected deployment commit instead of accepting an older CDN artifact', async t => {
  const original = await fixture(t);
  const sourceCommit = 'a'.repeat(40);
  const withCommit = async url => {
    const response = await original(url);
    if (url.endsWith('/seo-build.json')) return new Response(JSON.stringify({ ...JSON.parse(await response.text()), sourceCommit }));
    return response;
  };
  const result = await checkLiveSite({ baseUrl, expectedCommit: sourceCommit, attempts: 1, fetchImpl: withCommit });
  assert.equal(result.sourceCommit, sourceCommit);
  await assert.rejects(checkLiveSite({ baseUrl, expectedCommit: 'b'.repeat(40), attempts: 1, fetchImpl: withCommit }), /commit attendu/);
});

test('reports HTTP/apex redirect failures without failing the verified canonical site', async t => {
  const canonicalBase = 'https://www.sportifano.com';
  const original = await fixture(t, data, canonicalBase);
  const result = await checkLiveSite({ baseUrl: canonicalBase, attempts: 1, fetchImpl: async url => {
    if (url === 'http://www.sportifano.com/') return { status: 200, url: canonicalBase + '/' };
    if (url === 'http://sportifano.com/') throw Object.assign(new Error('DNS lookup failed'), { cause: { code: 'ENOTFOUND' } });
    if (url === 'https://sportifano.com/') return { status: 200, url };
    return original(url);
  } });
  assert.equal(result.status, 'passed');
  assert.equal(result.redirectChecks.length, 3);
  assert.equal(result.redirectWarnings.length, 2);
  assert.ok(result.redirectWarnings.some(warning => warning.error === 'ENOTFOUND'));
});
