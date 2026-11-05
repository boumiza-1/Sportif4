import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, access, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildSite } from '../scripts/build-seo.mjs';
import { productPath, categoryPath } from '../seo-shared.mjs';

const temp = await mkdtemp(path.join(os.tmpdir(), 'sportif4-seo-build-'));
const out = path.join(temp, 'site');
const fixture = {
  products: {
    'boot-one': { name: 'Crampons & performance', category: 'Chaussures', description: 'Une description réelle de crampons.', price: 129.9, stock: 3, image: 'https://res.cloudinary.com/demo/image/upload/v1/crampon.jpg', sizes: ['41', '42'], colors: ['Noir'], updatedAt: 1700000000000, id: 'must-not-override', privateNote: 'MUST-NOT-PUBLISH' },
    sold: { name: 'Modèle épuisé', category: 'Chaussures', price: 100, stock: 0, sizes: [], colors: [] },
    unknown: { name: 'Disponibilité inconnue', category: 'Été', price: 80, image: 'https://example.com/unknown.webp' },
    unsafe: { name: 'Texte <img src=x onerror="window.pwned=1">', category: 'Ete', description: '</script><script>window.pwned=1</script>', price: 'demander', stock: '', image: 'javascript:alert(1)' },
    hidden: { name: 'Hidden product', category: 'Homme', price: 1, active: false, stock: 20 }
  },
  settings: { name: 'Sportifano', phone: '+216 20 123 456', instagram: 'https://instagram.com/sportifano', deliveryFee: 8, secretAdminField: 'MUST-NOT-PUBLISH' }
};
const manifest = await buildSite({ outDir: out, data: fixture, now: new Date('2026-11-05T12:00:00Z') });
const html = url => readFile(path.join(out, decodeURIComponent(url), 'index.html'), 'utf8');
const schemas = source => [...source.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));

test.after(async () => { await rm(temp, { recursive: true, force: true }); });

test('build publishes real active product pages and crawlable homepage cards in initial HTML', async () => {
  assert.equal(manifest.products, 4);
  const home = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(home, /href="\/produits\/boot-one\/"/);
  assert.match(home, /Crampons &amp; performance/);
  assert.match(home, /data-seo-page="home"/);
  assert.doesNotMatch(home, /Hidden product|must-not-override|MUST-NOT-PUBLISH/);
  const product = await html(productPath('boot-one'));
  assert.match(product, /<h1>Crampons &amp; performance<\/h1>/);
  assert.match(product, /Une description réelle de crampons/);
  assert.match(product, /data-product-id="boot-one"/);
  assert.match(product, /data-view="boot-one"/);
  assert.match(product, /src="\/store\.js"/);
  assert.match(product, /href="\/style\.css"/);
});

test('metadata belongs to each page and never leaks homepage canonical or duplicate SEO tags', async () => {
  const product = await html(productPath('boot-one'));
  assert.match(product, /<link rel="canonical" href="https:\/\/www\.sportifano\.com\/produits\/boot-one\/">/);
  assert.equal((product.match(/<title>/g) || []).length, 1);
  assert.equal((product.match(/name="description"/g) || []).length, 1);
  assert.equal((product.match(/rel="canonical"/g) || []).length, 1);
  assert.match(product, /property="og:url" content="https:\/\/www\.sportifano\.com\/produits\/boot-one\/"/);
  const category = await html(categoryPath('Chaussures'));
  assert.match(category, /data-seo-page="category"/);
  assert.match(category, /<h1>Chaussures — collection sport en Tunisie<\/h1>/);
  assert.match(category, /href="\/produits\/boot-one\/"/);
  assert.match(category, /href="\/produits\/sold\/"/);
});

test('Product/Offer data uses actual price, currency, stock and canonical URL', async () => {
  const product = schemas(await html(productPath('boot-one'))).find(schema => schema['@type'] === 'Product');
  assert.equal(product.sku, 'boot-one');
  assert.equal(product.offers.price, '129.900');
  assert.equal(product.offers.priceCurrency, 'TND');
  assert.equal(product.offers.availability, 'https://schema.org/InStock');
  assert.equal(product.offers.url, 'https://www.sportifano.com/produits/boot-one/');
  assert.equal(product.brand, undefined);
  assert.equal(product.aggregateRating, undefined);
  const sold = schemas(await html(productPath('sold'))).find(schema => schema['@type'] === 'Product');
  assert.equal(sold.offers.availability, 'https://schema.org/OutOfStock');
  const unknown = schemas(await html(productPath('unknown'))).find(schema => schema['@type'] === 'Product');
  assert.equal(unknown.offers.availability, undefined);
  const unsafe = schemas(await html(productPath('unsafe'))).find(schema => schema['@type'] === 'Product');
  assert.equal(unsafe.offers, undefined);
});

test('catalog text and JSON-LD cannot create executable HTML, and invalid image schemes are omitted', async () => {
  const source = await html(productPath('unsafe'));
  assert.match(source, /&lt;img src=x onerror=/);
  assert.doesNotMatch(source, /<script>window\.pwned|<img src=x|src="javascript:/);
  const parsed = schemas(source).find(schema => schema['@type'] === 'Product');
  assert.equal(parsed.description, fixture.products.unsafe.description);
  assert.equal(parsed.image, undefined);
});

test('responsive product images and priority hero use real optimized Cloudinary variants', async () => {
  const home = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(home, /f_auto,q_auto,c_limit,w_1280/);
  assert.match(home, /fetchpriority="high" loading="eager"/);
  assert.match(home, /srcset="[^"]*320w[^"]*1280w"/);
  const product = await html(productPath('boot-one'));
  assert.match(product, /f_auto,q_auto,c_limit,w_960/);
});

test('sitemap includes real public landing pages, omits admin/hidden/empty categories and resolves to files', async () => {
  const xml = await readFile(path.join(out, 'sitemap.xml'), 'utf8');
  assert.doesNotMatch(xml, /admin\.html|\/hidden\/|homme-/);
  assert.match(xml, /\/contact\//);
  assert.match(xml, /\/livraison\//);
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(locations).size, locations.length);
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, 'https://www.sportifano.com');
    await access(path.join(out, decodeURIComponent(url.pathname), 'index.html'));
  }
  assert.notEqual(categoryPath('Été'), categoryPath('Ete'));
  assert.match(await html(categoryPath('Homme')), /content="noindex,follow"/);
  assert.match(await readFile(path.join(out, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/www\.sportifano\.com\/sitemap\.xml/);
});

test('support pages only state known policies and existing contact settings', async () => {
  const contact = await html('/contact/');
  assert.match(contact, /tel:\+21620123456/);
  assert.match(contact, /https:\/\/instagram\.com\/sportifano/);
  assert.doesNotMatch(contact, /MUST-NOT-PUBLISH|contact@sportifano/);
  const shipping = await html('/livraison/');
  assert.match(shipping, /paiement/i);
  assert.match(shipping, /livraison/i);
  assert.doesNotMatch(shipping, /24h|48h|retour gratuit/i);
});

test('public artifact contains runtime files but excludes source instructions and privileged data', async () => {
  const files = await readdir(out);
  for (const file of ['firebase.js', 'admin.html', 'seo-shared.mjs', 'CNAME', 'catalogue.json', '.nojekyll', '404.html']) assert.ok(files.includes(file), file);
  for (const file of ['README.md', 'FIX-LIRE.txt', 'scripts', 'tests', 'database.rules.json', 'seo.config.json', '.git']) assert.ok(!files.includes(file), file);
  const catalog = JSON.parse(await readFile(path.join(out, 'catalogue.json'), 'utf8'));
  assert.equal(catalog.products.length, 4);
  assert.equal(catalog.products.find(product => product.id === 'boot-one').privateNote, undefined);
  assert.equal(catalog.settings.secretAdminField, undefined);
  assert.match(await readFile(path.join(out, 'admin.html'), 'utf8'), /noindex/);
});

test('rebuilding removes retired product pages and fresh sitemap cannot retain stale IDs', async () => {
  const separate = path.join(temp, 'rebuild');
  await buildSite({ outDir: separate, data: fixture });
  await buildSite({ outDir: separate, data: { products: { sold: fixture.products.sold }, settings: {} } });
  await assert.rejects(access(path.join(separate, 'produits', 'boot-one', 'index.html')));
  assert.doesNotMatch(await readFile(path.join(separate, 'sitemap.xml'), 'utf8'), /boot-one/);
});

test('missing/malformed catalog fails without replacing the last valid build; no traversal is allowed', async () => {
  const protectedOutput = path.join(temp, 'protected');
  await buildSite({ outDir: protectedOutput, data: fixture });
  for (const bad of [{ error: 'permission denied' }, { products: [] }, { products: { invalid: null } }, { products: { '../escape': fixture.products.sold } }]) {
    await assert.rejects(buildSite({ outDir: protectedOutput, data: bad }));
    await access(path.join(protectedOutput, 'produits', 'boot-one', 'index.html'));
  }
});

test('an arbitrary nonempty output directory is never deleted', async () => {
  const preserved = path.join(temp, 'user-files');
  await mkdir(preserved);
  await writeFile(path.join(preserved, 'keep.txt'), 'keep');
  await assert.rejects(buildSite({ outDir: preserved, data: fixture }), /fichiers non gérés/);
  assert.equal(await readFile(path.join(preserved, 'keep.txt'), 'utf8'), 'keep');
});

test('an honestly empty Firebase catalog builds useful navigation without fabricated products', async () => {
  const empty = path.join(temp, 'empty');
  const result = await buildSite({ outDir: empty, data: { products: null, settings: null } });
  assert.equal(result.products, 0);
  assert.equal(result.sitemapUrls, 3);
  assert.match(await readFile(path.join(empty, 'index.html'), 'utf8'), /aucun produit visible/);
  assert.doesNotMatch(await readFile(path.join(empty, 'index.html'), 'utf8'), /demo-1|Training Performance Tee/);
});

test('missing or malformed prices never become a zero-price offer', async () => {
  const invalidPrices = path.join(temp, 'invalid-prices');
  const prices = [' ', [], null, undefined, NaN, {}, false];
  const products = Object.fromEntries(prices.map((price, index) => ['bad-price-' + index, { name: 'Prix à confirmer ' + index, category: 'Chaussures', price, stock: 2 }]));
  await buildSite({ outDir: invalidPrices, data: { products, settings: {} } });
  for (let index = 0; index < prices.length; index++) {
    const source = await readFile(path.join(invalidPrices, 'produits', 'bad-price-' + index, 'index.html'), 'utf8');
    assert.match(source, /Prix à confirmer/);
    assert.doesNotMatch(source, /0[.,]000 DT/);
    assert.equal(schemas(source).find(schema => schema['@type'] === 'Product').offers, undefined);
  }
});

test('dollar replacement tokens in public text and URLs stay literal and cannot duplicate HTML', async () => {
  const special = path.join(temp, 'special-replacement-text');
  const name = "Texte $& $` $'";
  const category = 'Collection $&';
  const instagram = 'https://instagram.com/sportifano/$&';
  await buildSite({ outDir: special, data: { products: { special: { name, category, price: 12, stock: 2 } }, settings: { instagram } } });
  const product = await readFile(path.join(special, 'produits', 'special', 'index.html'), 'utf8');
  assert.equal((product.match(/<body\b/g) || []).length, 1);
  assert.equal((product.match(/<\/head>/g) || []).length, 1);
  assert.ok(product.includes('<title>Texte $&amp; $` $&#39; | Sportifano Tunisie</title>'));
  assert.equal(schemas(product).find(schema => schema['@type'] === 'Product').name, name);
  const categoryPage = await readFile(path.join(special, decodeURIComponent(categoryPath(category)), 'index.html'), 'utf8');
  assert.ok(categoryPage.includes('data-category="Collection $&amp;"'));
  const home = await readFile(path.join(special, 'index.html'), 'utf8');
  assert.ok(home.includes('href="https://instagram.com/sportifano/$&amp;"'));
});
