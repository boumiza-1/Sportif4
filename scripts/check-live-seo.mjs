import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { productPath, categoryPath } from '../seo-shared.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const decode = value => String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, key) => {
  if (key[0] === '#') {
    const number = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
  }
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[key.toLowerCase()] ?? entity;
});
const plain = value => compact(decode(String(value).replace(/<[^>]+>/g, ' ')));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const attributes = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(match => [match[1].toLowerCase(), decode(match[3])]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
const content = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi'))].map(match => plain(match[1]));
const hasType = (node, type) => Array.isArray(node?.['@type']) ? node['@type'].includes(type) : node?.['@type'] === type;

function structuredData(html, pathname) {
  const result = [];
  function visit(value) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    result.push(value);
    if (Array.isArray(value['@graph'])) value['@graph'].forEach(visit);
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(match[1]).type !== 'application/ld+json') continue;
    try { visit(JSON.parse(match[2])); } catch { throw new Error(`${pathname}: JSON-LD invalide.`); }
  }
  return result;
}

function verifyPage(html, pathname, baseUrl, { indexable = true } = {}) {
  assert(/<html\b/i.test(html), `${pathname}: la réponse n’est pas une page HTML.`);
  const canonical = tags(html, 'link').filter(tag => (tag.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  assert(canonical.length === 1 && canonical[0].href === baseUrl + pathname, `${pathname}: canonical absent, dupliqué ou incorrect.`);
  const title = content(html, 'title');
  assert(title.length === 1 && title[0].length > 0, `${pathname}: titre absent ou dupliqué.`);
  const description = tags(html, 'meta').filter(tag => tag.name?.toLowerCase() === 'description');
  assert(description.length === 1 && compact(description[0].content), `${pathname}: description absente ou dupliquée.`);
  const headings = content(html, 'h1');
  assert(headings.length === 1 && headings[0].length > 0, `${pathname}: H1 absent ou dupliqué.`);
  const robots = tags(html, 'meta').filter(tag => tag.name?.toLowerCase() === 'robots').map(tag => tag.content || '').join(',');
  assert(!indexable || !/\bnoindex\b/i.test(robots), `${pathname}: une page publique attendue est en noindex.`);
  return { title: title[0], heading: headings[0], structured: structuredData(html, pathname) };
}

function normalizeBase(value) {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  assert(url.protocol === 'https:' || (url.protocol === 'http:' && loopback), 'Le domaine de vérification doit utiliser HTTPS (HTTP local accepté pour les tests).');
  assert(url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password, 'Le domaine de vérification doit être une origine sans chemin ni identifiants.');
  return url.origin;
}

const priceValid = value => ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
function availability(value) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return Number(value) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

async function inspectRedirects({ baseUrl, fetchImpl, signal, timeoutMs }) {
  if (baseUrl !== 'https://www.sportifano.com') return [];
  return Promise.all(['http://www.sportifano.com/', 'http://sportifano.com/', 'https://sportifano.com/'].map(async from => {
    try {
      const response = await fetchImpl(from, {
        redirect: 'follow',
        headers: { accept: 'text/html', 'cache-control': 'no-cache' },
        signal: AbortSignal.any([signal, AbortSignal.timeout(Math.min(10000, timeoutMs))])
      });
      const finalUrl = response.url || from;
      const target = new URL(finalUrl);
      return { from, finalUrl, status: response.status, ok: response.status === 200 && target.origin === baseUrl && target.pathname === '/' };
    } catch (error) {
      return { from, finalUrl: null, status: null, ok: false, error: String(error.cause?.code || error.name || 'Erreur réseau') };
    }
  }));
}

async function inspect({ baseUrl, fetchImpl, timeoutMs, signal, sampleLimit, expectedCommit }) {
  let requests = 0;
  async function get(pathname) {
    requests++;
    const response = await fetchImpl(baseUrl + pathname, {
      headers: { accept: 'text/html,application/json,application/xml,text/plain', 'cache-control': 'no-cache' },
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    });
    assert(response.status === 200, `${pathname}: HTTP ${response.status}, attendu 200.`);
    return response.text();
  }
  const [home, sitemap, robots, snapshotText, buildText] = await Promise.all(['/', '/sitemap.xml', '/robots.txt', '/catalogue.json', '/seo-build.json'].map(get));
  let snapshot, build;
  try { snapshot = JSON.parse(snapshotText); } catch { throw new Error('/catalogue.json: JSON invalide.'); }
  try { build = JSON.parse(buildText); } catch { throw new Error('/seo-build.json: JSON invalide.'); }
  assert(snapshot && Array.isArray(snapshot.products), '/catalogue.json: collection de produits absente.');
  assert(snapshot.products.every(product => product && typeof product.id === 'string' && typeof product.name === 'string' && product.active !== false), '/catalogue.json: produit public invalide.');
  assert(build && build.baseUrl === baseUrl && build.products === snapshot.products.length, '/seo-build.json: version du catalogue incohérente.');
  if (expectedCommit) assert(build.sourceCommit === expectedCommit, '/seo-build.json: le CDN ne sert pas encore le commit attendu.');
  assert(/<urlset\b/i.test(sitemap), '/sitemap.xml: document sitemap invalide.');
  const urls = [...sitemap.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(match => decode(match[1].trim()));
  assert(urls.length > 0 && new Set(urls).size === urls.length, '/sitemap.xml: URL absentes ou dupliquées.');
  for (const value of urls) {
    const url = new URL(value);
    assert(url.origin === baseUrl && !url.search && !url.hash && !/^\/admin(?:[./]|$)/i.test(url.pathname), '/sitemap.xml: URL non canonique ou administrateur incluse.');
  }
  assert(urls.includes(baseUrl + '/'), '/sitemap.xml: accueil absent.');
  assert(robots.split(/\r?\n/).some(line => /^sitemap\s*:/i.test(line) && line.replace(/^sitemap\s*:\s*/i, '').trim() === baseUrl + '/sitemap.xml'), '/robots.txt: déclaration du sitemap absente.');
  assert(!/^\s*Disallow\s*:\s*\/\s*$/im.test(robots), '/robots.txt: exploration de la racine interdite.');
  const homePage = verifyPage(home, '/', baseUrl);
  const sample = snapshot.products.slice(0, sampleLimit);
  const category = snapshot.products.find(product => typeof product.category === 'string' && product.category.trim())?.category;
  const productPaths = sample.map(product => productPath(product.id));
  const categoryUrl = category ? categoryPath(category) : null;
  const expectedPaths = [...productPaths, ...(categoryUrl ? [categoryUrl] : []), '/contact/', '/livraison/'];
  for (const pathname of expectedPaths) assert(urls.includes(baseUrl + pathname), `/sitemap.xml: page attendue absente (${pathname}).`);
  const html = new Map(await Promise.all([...expectedPaths, '/admin.html'].map(async pathname => [pathname, await get(pathname)])));
  const titles = new Set([homePage.title]);
  for (const pathname of expectedPaths) {
    const page = verifyPage(html.get(pathname), pathname, baseUrl);
    assert(!titles.has(page.title), `${pathname}: titre identique à une autre page contrôlée.`);
    titles.add(page.title);
  }
  const homeAnchors = tags(home, 'a');
  for (const product of sample) {
    const pathname = productPath(product.id), source = html.get(pathname);
    const page = verifyPage(source, pathname, baseUrl);
    assert(homeAnchors.some(anchor => anchor.href === pathname || anchor.href === baseUrl + pathname), `${pathname}: lien absent du HTML d’accueil.`);
    assert(page.heading === compact(product.name), `${pathname}: H1 différent du produit publié.`);
    assert(page.title.includes(compact(product.name)), `${pathname}: nom produit absent du titre.`);
    const schema = page.structured.filter(node => hasType(node, 'Product'));
    assert(schema.length === 1, `${pathname}: un seul schéma Product est attendu.`);
    const data = schema[0];
    assert(data.name === product.name && data.sku === product.id && data.url === baseUrl + pathname, `${pathname}: schéma Product différent du catalogue publié.`);
    if (priceValid(product.price)) {
      const offer = data.offers;
      assert(offer && !Array.isArray(offer) && hasType(offer, 'Offer') && offer.priceCurrency === 'TND' && Number(offer.price) === Number(Number(product.price).toFixed(3)) && offer.url === baseUrl + pathname, `${pathname}: prix ou devise de l’offre différent du catalogue publié.`);
      const expected = availability(product.stock);
      assert(expected ? offer.availability === expected : !Object.hasOwn(offer, 'availability'), `${pathname}: disponibilité structurée différente du stock publié.`);
    } else assert(!data.offers, `${pathname}: offre publiée sans prix valide.`);
  }
  if (categoryUrl) assert(verifyPage(html.get(categoryUrl), categoryUrl, baseUrl).heading.includes(compact(category)), `${categoryUrl}: nom de collection absent du H1.`);
  const adminRobots = tags(html.get('/admin.html'), 'meta').filter(tag => tag.name?.toLowerCase() === 'robots').map(tag => tag.content || '').join(',');
  assert(/\bnoindex\b/i.test(adminRobots), '/admin.html: noindex absent.');
  return { baseUrl, sourceCommit: build.sourceCommit || null, generatedAt: snapshot.generatedAt || null, publishedProducts: snapshot.products.length, checkedProducts: sample.length, checkedCategories: category ? 1 : 0, sitemapUrls: urls.length, checkedPages: expectedPaths.length + 2, requests, emptyCatalog: snapshot.products.length === 0 };
}

/** Read-only checks of the deployed HTML and its own published catalog snapshot. */
export async function checkLiveSite({ baseUrl, expectedCommit = process.env.EXPECTED_COMMIT, fetchImpl = fetch, attempts = 3, retryDelayMs = 5000, timeoutMs = 15000, totalTimeoutMs = 55000, sampleLimit = 3 } = {}) {
  if (!baseUrl) baseUrl = JSON.parse(await readFile(path.join(ROOT, 'seo.config.json'), 'utf8')).baseUrl;
  baseUrl = normalizeBase(baseUrl);
  attempts = Math.max(1, Math.min(3, Number(attempts) || 1));
  sampleLimit = Math.max(0, Math.min(3, Number(sampleLimit) || 0));
  const signal = AbortSignal.timeout(totalTimeoutMs);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await inspect({ baseUrl, fetchImpl, timeoutMs, signal, sampleLimit, expectedCommit });
      const redirectChecks = await inspectRedirects({ baseUrl, fetchImpl, signal, timeoutMs });
      return { status: 'passed', attempt, ...result, redirectChecks, redirectWarnings: redirectChecks.filter(check => !check.ok) };
    } catch (error) {
      lastError = error;
      if (attempt < attempts && !signal.aborted) {
        try { await delay(retryDelayMs, undefined, { signal }); } catch { break; }
      } else break;
    }
  }
  throw new Error(`Vérification SEO en ligne échouée : ${lastError?.message || 'délai dépassé'}`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--base-url', '--expected-commit'].includes(args[index]) || !args[index + 1]) throw new Error('Usage : node scripts/check-live-seo.mjs [--base-url https://www.sportifano.com] [--expected-commit SHA]');
    options[args[index]] = args[index + 1];
  }
  console.log(JSON.stringify(await checkLiveSite({ baseUrl: options['--base-url'], expectedCommit: options['--expected-commit'] || process.env.EXPECTED_COMMIT }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
