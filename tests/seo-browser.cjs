// Integration checks use generated fixture pages and mock Firebase modules only.
// They never read or write production catalog, customers, or orders.
// Run from the checkout: node tests/seo-browser.cjs
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const fixtures = {
  products: {
    boot1: { name: 'Crampons Nike Phantom', description: 'Crampons de football pour terrain sec. Tailles et couleurs au choix.', category: 'Chaussures', price: 129, oldPrice: 149, stock: 5, sizes: ['40', '41', '42'], colors: ['Noir', 'Rouge'], image: 'https://res.cloudinary.com/demo/image/upload/v123/phantom.png', active: true },
    boot2: { name: 'Crampons Adidas Copa', description: 'Chaussures de football confortables.', category: 'Chaussures', price: 89, stock: 3, sizes: ['41', '42'], colors: ['Blanc'], image: 'https://res.cloudinary.com/demo/image/upload/v123/copa.png', active: true },
    sold: { name: 'Crampons Puma Future', description: 'Modèle actuellement épuisé.', category: 'Chaussures', price: 99, stock: 0, sizes: ['42'], colors: ['Noir'], active: true },
    shirt: { name: 'Maillot training', description: 'Maillot léger pour le sport.', category: 'Homme', price: 39, stock: 4, sizes: ['S', 'M', 'L'], colors: ['Bleu'], active: true },
    unknown: { name: 'Sac de sport', description: 'Sac dont le stock reste à confirmer.', category: 'Accessoires', price: 49, active: true },
    hidden: { name: 'Produit masqué', description: 'Ne doit pas être publié.', category: 'Homme', price: 1, stock: 99, active: false },
  },
  settings: { name: 'Sportifano', phone: '+21612345678', instagram: 'https://instagram.com/sportifano', deliveryFee: 8 },
};
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV3sAAAAASUVORK5CYII=', 'base64');
const appModule = 'export const initializeApp = config => ({config});';
const authModule = `
  const auth = {currentUser: null};
  export const getAuth = () => auth;
  export const onAuthStateChanged = (a, callback) => { queueMicrotask(() => callback(null)); return () => {}; };
  export const createUserWithEmailAndPassword = async () => { throw new Error('Fixture authentication disabled'); };
  export const signInWithEmailAndPassword = createUserWithEmailAndPassword;
  export const signOut = async () => {};
  export const updateProfile = createUserWithEmailAndPassword;
`;
const databaseModule = `
  export const getDatabase = () => ({});
  export const ref = (db, path) => ({path});
  export const get = async r => {
    window.__seoReadPaths.push(r.path);
    if (window.__seoFailures.includes(r.path)) throw new Error('Fixture database read failed');
    const value = r.path === 'products' ? window.__seoFixture.products : r.path === 'settings/store' ? window.__seoFixture.settings : null;
    return { val: () => value, exists: () => value !== null };
  };
  export const set = async () => { window.__seoWrites++; throw new Error('Writes forbidden in fixture tests'); };
  export const update = set;
  export const remove = set;
  export const push = () => ({key: 'fixture-never-submitted'});
  export const serverTimestamp = () => 0;
  export const query = r => r;
  export const orderByChild = v => v;
  export const equalTo = v => v;
`;

async function makeContext(browser, baseURL, options = {}) {
  const { javaScriptEnabled = true, blockedSDK = false, failures = [], data = fixtures, mobile = false } = options;
  const context = await browser.newContext({ javaScriptEnabled, viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 900 } });
  await context.addInitScript(({ data, failures }) => {
    window.__seoFixture = data;
    window.__seoFailures = failures;
    window.__seoReadPaths = [];
    window.__seoWrites = 0;
  }, { data, failures });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith(baseURL + '/')) return route.continue();
    if (!blockedSDK && url.startsWith('https://www.gstatic.com/firebasejs/')) {
      let body;
      if (url.endsWith('/firebase-app.js')) body = appModule;
      else if (url.endsWith('/firebase-auth.js')) body = authModule;
      else if (url.endsWith('/firebase-database.js')) body = databaseModule;
      if (body) return route.fulfill({ status: 200, contentType: 'text/javascript', body, headers: { 'access-control-allow-origin': '*' } });
    }
    if (request.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: pixel });
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.__seoPageErrors = errors;
  return { context, page, errors };
}

async function waitForReads(page) {
  await page.waitForFunction(() => ['live', 'snapshot', 'unavailable'].includes(document.body.dataset.catalogReady));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
  assert.deepEqual(page.__seoPageErrors, [], 'storefront scripts must complete without runtime errors');
}

async function productData(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => {
      const value = JSON.parse(node.textContent);
      return Array.isArray(value) ? value : value['@graph'] || [value];
    });
    return all.find(value => value['@type'] === 'Product');
  });
}

async function main() {
  const { productPath, categoryPath } = await import(pathToFileURL(path.join(root, 'seo-shared.mjs')).href);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'sportif4-seo-browser-'));
  const fixtureFile = path.join(temp, 'fixture.json');
  const output = path.join(temp, 'dist');
  await fs.writeFile(fixtureFile, JSON.stringify(fixtures));
  execFileSync(process.execPath, ['scripts/build-seo.mjs', '--data', fixtureFile, '--out', output], { cwd: root, stdio: 'pipe' });
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://fixture').pathname);
      let file = path.resolve(output, '.' + pathname);
      if (!file.startsWith(output + path.sep) && file !== output) return res.writeHead(403).end();
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const content = await fs.readFile(file);
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(content);
    } catch { res.writeHead(404).end('Fixture page not found'); }
  });
  let browser;
  let passed = 0;
  const check = async (label, run) => { await run(); passed++; console.log('PASS ' + label); };
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const baseURL = 'http://127.0.0.1:' + server.address().port;
    const executablePath = process.env.CHROMIUM_PATH || (fsSync.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const nojs = await makeContext(browser, baseURL, { javaScriptEnabled: false });
    await check('home, category and product have real content and canonical links without JavaScript', async () => {
      const titles = new Set();
      for (const [pathname, h1] of [['/', null], [categoryPath('Chaussures'), 'Chaussures'], [productPath('boot1'), fixtures.products.boot1.name]]) {
        await nojs.page.goto(baseURL + pathname);
        assert.equal(await nojs.page.locator('h1').count(), 1);
        if (h1) assert.match(await nojs.page.locator('h1').innerText(), new RegExp(h1));
        titles.add(await nojs.page.title());
        assert.equal(await nojs.page.locator('link[rel="canonical"]').getAttribute('href'), 'https://www.sportifano.com' + pathname);
        assert.ok((await nojs.page.locator('meta[name="description"]').getAttribute('content')).length > 40);
        assert.match(await nojs.page.locator('main').innerText(), /Crampons/);
        assert.doesNotMatch(await nojs.page.locator('main').innerText(), /Produit masqué/);
      }
      assert.equal(titles.size, 3);
      const schema = await productData(nojs.page);
      assert.equal(schema.name, fixtures.products.boot1.name);
      assert.equal(schema.offers.priceCurrency, 'TND');
      assert.equal(Number(schema.offers.price), 129);
      assert.equal(schema.offers.availability, 'https://schema.org/InStock');
      await nojs.page.goto(baseURL + '/');
      assert.ok(await nojs.page.locator('#productGrid a[href="' + productPath('boot1') + '"]').count() > 0);
    });
    await check('sitemap, robots and admin indexing contain the expected controls', async () => {
      const sitemap = await (await nojs.page.request.get(baseURL + '/sitemap.xml')).text();
      assert.ok(sitemap.includes('https://www.sportifano.com' + productPath('boot1')));
      assert.ok(sitemap.includes('https://www.sportifano.com' + categoryPath('Chaussures')));
      assert.ok(!sitemap.includes(productPath('hidden')));
      assert.ok(!sitemap.includes('admin.html'));
      const robots = await (await nojs.page.request.get(baseURL + '/robots.txt')).text();
      assert.match(robots, /Sitemap:\s*https:\/\/www\.sportifano\.com\/sitemap\.xml/i);
      await nojs.page.goto(baseURL + '/admin.html');
      assert.match(await nojs.page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    });
    await check('all sitemap pages and their internal navigation links resolve', async () => {
      const sitemap = await (await nojs.page.request.get(baseURL + '/sitemap.xml')).text();
      const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1].replaceAll('&amp;', '&')));
      const visited = new Set();
      for (const location of locations) {
        const response = await nojs.page.goto(baseURL + location.pathname);
        assert.equal(response.status(), 200, location.pathname);
        const hrefs = await nojs.page.locator('a[href]').evaluateAll(links => links.map(link => link.href));
        for (const href of hrefs) {
          const url = new URL(href);
          if (!['http:', 'https:'].includes(url.protocol) || ![new URL(baseURL).hostname, 'www.sportifano.com'].includes(url.hostname)) continue;
          if (visited.has(url.pathname)) continue;
          visited.add(url.pathname);
          const result = await nojs.page.request.get(baseURL + url.pathname);
          assert.equal(result.status(), 200, 'broken link ' + href);
        }
      }
    });
    await nojs.context.close();

    const shop = await makeContext(browser, baseURL);
    await check('real product URLs retain variants, cart and checkout across pages', async () => {
      await shop.page.goto(baseURL + '/');
      await waitForReads(shop.page);
      await shop.page.locator('#productGrid a[href="' + productPath('boot1') + '"]').first().click();
      await shop.page.waitForURL(baseURL + productPath('boot1'));
      await waitForReads(shop.page);
      await shop.page.locator('#seoProductContent [data-view="boot1"]').click();
      await shop.page.locator('#addProductForm select[name="size"]').selectOption('42');
      await shop.page.locator('#addProductForm select[name="color"]').selectOption('Rouge');
      await shop.page.locator('#addProductForm button').click();
      assert.equal(await shop.page.locator('#cartCount').innerText(), '1');
      await shop.page.goto(baseURL + categoryPath('Chaussures'));
      await waitForReads(shop.page);
      await shop.page.locator('#cartBtn').click();
      assert.match(await shop.page.locator('#cartContents').innerText(), /Crampons Nike Phantom/);
      assert.match(await shop.page.locator('#cartContents').innerText(), /42.*Rouge/);
      await shop.page.locator('#checkoutBtn').click();
      assert.equal(await shop.page.locator('#checkoutForm').isVisible(), true);
      assert.equal(await shop.page.evaluate(() => window.__seoWrites), 0);
      assert.deepEqual(shop.errors, []);
    });
    await shop.context.close();

    const expanded = structuredClone(fixtures);
    expanded.products.fresh = { name: 'Ensemble fitness inédit', description: 'Produit ajouté depuis la dernière publication.', category: 'Fitness inédit', price: 59, stock: 6, sizes: ['S', 'M'], colors: ['Vert'], active: true };
    const fresh = await makeContext(browser, baseURL, { data: expanded });
    await check('new live products and categories remain purchasable before static regeneration without broken links', async () => {
      await fresh.page.goto(baseURL + '/');
      await waitForReads(fresh.page);
      assert.ok(await fresh.page.locator('#productGrid a[href="' + productPath('boot1') + '"]').count() > 0);
      assert.equal(await fresh.page.locator('a[href="' + productPath('fresh') + '"]').count(), 0);
      assert.equal(await fresh.page.locator('a[href="' + categoryPath('Fitness inédit') + '"]').count(), 0);
      const categoryButton = fresh.page.locator('#filters button[data-category="Fitness inédit"]');
      assert.equal(await categoryButton.count(), 1);
      await categoryButton.click();
      assert.match(await fresh.page.locator('#productGrid').innerText(), /Ensemble fitness inédit/);
      assert.doesNotMatch(await fresh.page.locator('#productGrid').innerText(), /Crampons Nike Phantom/);
      await fresh.page.locator('#productGrid button[data-view="fresh"]').first().click();
      await fresh.page.locator('#addProductForm select[name="size"]').selectOption('M');
      await fresh.page.locator('#addProductForm select[name="color"]').selectOption('Vert');
      await fresh.page.locator('#addProductForm button').click();
      assert.equal(await fresh.page.locator('#cartCount').innerText(), '1');
      const cart = await fresh.page.evaluate(() => JSON.parse(localStorage.getItem('sportifano_cart')));
      assert.equal(cart[0].id, 'fresh');
      assert.equal(cart[0].size, 'M');
      assert.equal(cart[0].color, 'Vert');
      assert.equal(await fresh.page.evaluate(() => window.__seoWrites), 0);
      assert.deepEqual(fresh.errors, []);
    });
    await fresh.context.close();

    const current = structuredClone(fixtures);
    current.products.boot1.price = 119;
    current.products.boot1.name = '<Sport> Nike & Co';
    current.products.boot1.stock = 0;
    const updated = await makeContext(browser, baseURL, { data: current });
    await check('current Firebase price and stock agree with visible product and structured data', async () => {
      await updated.page.goto(baseURL + productPath('boot1'));
      await waitForReads(updated.page);
      await updated.page.waitForFunction(() => document.querySelector('#seoProductContent [data-seo-price]').textContent.includes('119'));
      assert.match(await updated.page.locator('#seoProductContent [data-seo-stock]').innerText(), /rupture|indisponible|0/i);
      const schema = await productData(updated.page);
      assert.equal(Number(schema.offers.price), 119);
      assert.equal(schema.name, current.products.boot1.name);
      assert.equal(await updated.page.locator('#seoProductContent h1').innerText(), current.products.boot1.name);
      assert.equal(schema.offers.availability, 'https://schema.org/OutOfStock');
      assert.deepEqual(updated.errors, []);
    });
    await updated.context.close();

    const missing = structuredClone(fixtures);
    delete missing.products.boot1;
    const removed = await makeContext(browser, baseURL, { data: missing });
    await check('a removed live product is not advertised or purchasable from an old generated URL', async () => {
      await removed.page.goto(baseURL + productPath('boot1'));
      await waitForReads(removed.page);
      assert.match(await removed.page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
      assert.equal(await removed.page.locator('#seoProductContent [data-view="boot1"]:not(:disabled)').count(), 0);
      assert.equal(await productData(removed.page), undefined);
      assert.deepEqual(removed.errors, []);
    });
    await removed.context.close();

    const partial = await makeContext(browser, baseURL, { failures: ['settings/store'] });
    await check('settings failure does not erase a successfully loaded catalog', async () => {
      await partial.page.goto(baseURL + categoryPath('Chaussures'));
      await waitForReads(partial.page);
      assert.match(await partial.page.locator('#productGrid').innerText(), /Crampons Nike Phantom/);
      assert.deepEqual(partial.errors, []);
    });
    await partial.context.close();

    const stale = await makeContext(browser, baseURL, { failures: ['products'] });
    await check('database outage preserves readable generated catalog but blocks stale checkout', async () => {
      await stale.context.addInitScript(() => localStorage.setItem('sportifano_cart', JSON.stringify([{ id: 'boot1', key: 'boot1|42|Rouge', size: '42', color: 'Rouge', qty: 1 }])));
      await stale.page.goto(baseURL + categoryPath('Chaussures'));
      await waitForReads(stale.page);
      assert.match(await stale.page.locator('#productGrid').innerText(), /Crampons Nike Phantom/);
      await stale.page.locator('#cartBtn').click();
      assert.equal(await stale.page.locator('#checkoutBtn').isDisabled(), true);
      assert.equal(await stale.page.evaluate(() => window.__seoWrites), 0);
      assert.deepEqual(stale.errors, []);
    });
    await stale.context.close();

    const blocked = await makeContext(browser, baseURL, { blockedSDK: true });
    await check('blocked Firebase SDK still leaves static product and category links readable', async () => {
      await blocked.page.goto(baseURL + productPath('boot1'));
      assert.equal(await blocked.page.locator('#seoProductContent h1').innerText(), fixtures.products.boot1.name);
      assert.match(await blocked.page.locator('#seoProductContent').innerText(), /129/);
      assert.ok(await blocked.page.locator('a[href="' + categoryPath('Chaussures') + '"]').count() > 0);
      assert.equal(await blocked.page.evaluate(() => window.__seoWrites), 0);
    });
    await blocked.context.close();

    const mobile = await makeContext(browser, baseURL, { mobile: true });
    await check('generated product and category layouts fit a mobile viewport', async () => {
      for (const pathname of [productPath('boot1'), categoryPath('Chaussures')]) {
        await mobile.page.goto(baseURL + pathname);
        await waitForReads(mobile.page);
        const overflow = await mobile.page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 8).map(el => ({tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right})));
        assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, pathname + ' ' + JSON.stringify(overflow));
      }
      await mobile.page.goto(baseURL + productPath('boot1'));
      await waitForReads(mobile.page);
      await mobile.page.screenshot({ path: '/tmp/sportif4-seo-product-mobile.png', fullPage: true });
      assert.deepEqual(mobile.errors, []);
    });
    await mobile.context.close();
    console.log(`${passed} browser checks passed (fixture catalog only; no production writes).`);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
