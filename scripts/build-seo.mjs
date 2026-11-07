import { readFile, writeFile, mkdir, readdir, rm, lstat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { productPath, categoryPath, imageUrl, imageSrcset } from '../seo-shared.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = '.sportifano-seo-output';
const PUBLIC_FIELDS = ['name', 'category', 'price', 'oldPrice', 'stock', 'active', 'badge', 'description', 'image', 'sizes', 'colors', 'createdAt', 'updatedAt'];
const RUNTIME_FILES = ['style.css', 'chatbot.css', 'chatbot-nlp.js', 'chatbot.js', 'store.js', 'product-options.mjs', 'common.js', 'firebase.js', 'database-api.js', 'admin.html', 'admin.js', 'admin.css', 'cloudinary.js', 'seo-shared.mjs', 'CNAME'];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const clip = (value, max = 160) => compact(value).length > max ? compact(value).slice(0, max - 1).trimEnd() + '…' : compact(value);
const asList = value => (Array.isArray(value) ? value : String(value ?? '').split(',')).map(v => String(v).trim()).filter(Boolean);
const validPrice = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
const money = value => validPrice(value) ? Number(value).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT' : 'Prix à confirmer';
const serialize = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function availability(product) {
  const value = product.stock;
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return Number(value) > 0 ? 'InStock' : 'OutOfStock';
}

function stockText(product) {
  return { InStock: 'En stock — disponibilité à confirmer lors de la commande.', OutOfStock: 'Rupture de stock.' }[availability(product)] || 'Disponibilité à confirmer auprès de la boutique.';
}

function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Le catalogue doit être un objet contenant products et settings.');
  if (!Object.hasOwn(raw, 'products')) throw new Error('Le catalogue ne contient pas de collection products.');
  if (raw.products !== null && (!raw.products || typeof raw.products !== 'object' || Array.isArray(raw.products))) throw new Error('La collection products doit être un objet Firebase ou null.');
  const products = [];
  for (const [id, value] of Object.entries(raw.products || {})) {
    productPath(id); // Reject invalid Firebase keys before they can become filesystem paths.
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Données produit invalides pour ${id}.`);
    if (value.active === false) continue;
    if (typeof value.name !== 'string' || !value.name.trim()) throw new Error(`Nom de produit manquant pour ${id}.`);
    const product = Object.fromEntries(PUBLIC_FIELDS.filter(field => Object.hasOwn(value, field)).map(field => [field, value[field]]));
    product.name = value.name.trim();
    product.category = typeof value.category === 'string' ? value.category.trim() : '';
    product.sizes = asList(value.sizes);
    product.colors = asList(value.colors);
    product.id = id; // A stored id field must never override the Firebase key.
    products.push(product);
  }
  products.sort((a, b) => a.id.localeCompare(b.id));
  const rawSettings = raw.settings ?? raw['settings/store'] ?? {};
  if (rawSettings !== null && (typeof rawSettings !== 'object' || Array.isArray(rawSettings))) throw new Error('Les paramètres de boutique doivent être un objet.');
  const settings = {};
  for (const field of ['name', 'phone', 'instagram']) {
    if (typeof rawSettings?.[field] === 'string') settings[field] = rawSettings[field].trim();
  }
  if (validPrice(rawSettings?.deliveryFee)) settings.deliveryFee = Number(rawSettings.deliveryFee);
  return { products, settings };
}

export async function fetchPublicCatalog(rootDir = ROOT) {
  const source = await readFile(path.join(rootDir, 'firebase.js'), 'utf8');
  const databaseURL = source.match(/databaseURL\s*:\s*['"](https:\/\/[^'"]+)['"]/)?.[1];
  if (!databaseURL) throw new Error('databaseURL HTTPS introuvable dans firebase.js.');
  const origin = new URL(databaseURL);
  if (!/\.(firebaseio\.com|firebasedatabase\.app)$/.test(origin.hostname) || origin.username || origin.password || origin.search || origin.hash) throw new Error('Hôte Firebase public non valide.');
  async function get(relative) {
    const url = new URL(relative, origin.href.replace(/\/?$/, '/'));
    const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Lecture publique Firebase refusée pour ${relative} (HTTP ${response.status}).`);
    let result;
    try { result = await response.json(); } catch { throw new Error(`Réponse JSON Firebase invalide pour ${relative}.`); }
    if (result && typeof result === 'object' && Object.hasOwn(result, 'error')) throw new Error(`Erreur Firebase pour ${relative}.`);
    return result;
  }
  const [products, settings] = await Promise.all([get('products.json'), get('settings/store.json')]);
  return { products, settings };
}

function imageMarkup(product, { priority = false, width = 640, className = '' } = {}) {
  const src = imageUrl(product.image, width);
  if (!src) return `<div class="seo-image-placeholder" aria-label="Photo non renseignée">${escape(product.name)}</div>`;
  const srcset = imageSrcset(product.image);
  return `<img${className ? ` class="${escape(className)}"` : ''} src="${escape(src)}"${srcset ? ` srcset="${escape(srcset)}" sizes="${priority ? '(max-width: 680px) 100vw, 58vw' : '(max-width: 680px) 50vw, 25vw'}"` : ''} alt="${escape(product.name)}" width="640" height="780" ${priority ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">`;
}

function productCard(product) {
  const url = productPath(product.id);
  return `<article class="product-card"><a class="product-pic" href="${escape(url)}">${imageMarkup(product)}${product.badge ? `<span class="product-badge">${escape(product.badge)}</span>` : ''}<span class="product-add">VOIR LE PRODUIT ↗</span></a><div class="product-info"><small>${escape(product.category)}</small><h3><a href="${escape(url)}">${escape(product.name)}</a></h3><b>${escape(money(product.price))}</b>${validPrice(product.oldPrice) && Number(product.oldPrice) > Number(product.price) ? `<span class="old-price">${escape(money(product.oldPrice))}</span>` : ''}</div></article>`;
}

function replaceContents(html, id, contents, tag = 'div') {
  const pattern = new RegExp(`(<${tag}\\b[^>]*\\bid=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/${tag}>)`, 'i');
  if (!pattern.test(html)) throw new Error(`Emplacement HTML requis introuvable : #${id}.`);
  return html.replace(pattern, (_all, start, end) => start + contents + end);
}

function absoluteAssets(html) {
  return html.replace(/\b(href|src)=(['"])(index\.html|admin\.html|style\.css|store\.js|common\.js|firebase\.js|admin\.css|admin\.js|seo-shared\.mjs)\2/g, (_all, attr, quote, file) => `${attr}=${quote}${file === 'index.html' ? '/' : '/' + file}${quote}`);
}

function navLinks(categories) {
  return `<a href="/#catalogue">Collection</a>` + categories.map(category => `<a href="${escape(categoryPath(category))}">${escape(category)}</a>`).join('');
}

function shell(template, categories, settings) {
  let html = absoluteAssets(template);
  const populated = categories.filter(category => category.populated).map(category => category.name);
  html = html.replace(/(<nav\b[^>]*class=["']desktop-nav["'][^>]*>)[\s\S]*?(<\/nav>)/i, (_all, start, end) => start + navLinks(populated.slice(0, 5)) + end);
  html = replaceContents(html, 'mobileLinks', navLinks(populated));
  if (settings.phone && /^[+\d ()-]{6,30}$/.test(settings.phone)) html = html.replace(/(<a\b[^>]*id=["']footerPhone["'][^>]*>)[\s\S]*?(<\/a>)/i, () => `<a id="footerPhone" href="tel:${escape(settings.phone.replace(/[^+\d]/g, ''))}">${escape(settings.phone)}</a>`);
  if (settings.instagram && /^https:\/\//i.test(settings.instagram)) html = html.replace(/(<a\b[^>]*id=["']socialLink["'][^>]*\bhref=)["'][^"']*["']/i, (_all, prefix) => `${prefix}"${escape(settings.instagram)}"`);
  return html;
}

function structuredScript(value, id) {
  return `<script${id ? ` id="${id}"` : ''} type="application/ld+json">${serialize(value)}</script>`;
}

function withMetadata(html, { title, description, canonical, image = '', type = 'website', noindex = false, structured = [] }) {
  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b(?=[^>]*(?:name|property)\s*=\s*["'](?:description|robots|twitter:[^"']+|og:[^"']+)["'])[^>]*>/gi, '')
    .replace(/<link\b(?=[^>]*rel\s*=\s*["']canonical["'])[^>]*>/gi, '')
    .replace(/<script\b(?=[^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '');
  const head = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'}"><meta property="og:locale" content="fr_TN"><meta property="og:site_name" content="Sportifano"><meta property="og:type" content="${escape(type)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">${image ? `<meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="${escape(title)}"><meta name="twitter:image" content="${escape(image)}">` : ''}${structured.map((data, index) => structuredScript(data, data['@type'] === 'Product' ? 'seoProductSchema' : index === 0 ? 'seoStructuredData' : undefined)).join('')}`;
  return html.replace(/<\/head>/i, () => head + '</head>');
}

function withBody(html, type, attrs = {}) {
  return html.replace(/<body\b[^>]*>/i, () => `<body data-seo-page="${type}"${Object.entries(attrs).map(([key, value]) => ` data-${key}="${escape(value)}"`).join('')}>`);
}

function breadcrumbs(items) {
  return `<nav class="shell breadcrumbs" aria-label="Fil d’Ariane">${items.map((item, index) => index === items.length - 1 ? `<span aria-current="page">${escape(item.name)}</span>` : `<a href="${escape(item.path)}">${escape(item.name)}</a><span aria-hidden="true"> / </span>`).join('')}</nav>`;
}

function breadcrumbData(items, baseUrl) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: baseUrl + item.path })) };
}

function categoryToolbar(categories, selected = '') {
  return `<div class="catalog-toolbar"><nav class="filters" id="filters" aria-label="Collections"><a href="/#catalogue"${!selected ? ' class="active"' : ''}>Tout voir</a>${categories.filter(category => category.populated).map(category => `<a href="${escape(categoryPath(category.name))}"${category.name === selected ? ' class="active" aria-current="page"' : ''}>${escape(category.name)}</a>`).join('')}</nav><div class="toolbar-right"><label class="seo-search-label" for="searchInput">Rechercher un article</label><input id="searchInput" class="search-field" placeholder="Rechercher un article..."><select id="sortSelect" aria-label="Trier les produits"><option value="new">Nouveautés</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select></div></div>`;
}

function productMain(product, related, baseUrl) {
  const crumbs = [{ name: 'Accueil', path: '/' }, ...(product.category ? [{ name: product.category, path: categoryPath(product.category) }] : []), { name: product.name, path: productPath(product.id) }];
  const description = product.description || 'Consultez les options et les informations disponibles pour cet article Sportifano.';
  const attributes = [['Tailles', product.sizes.join(', ')], ['Couleurs', product.colors.join(', ')]].filter(([, value]) => value);
  return { crumbs, html: `<main class="seo-main">${breadcrumbs(crumbs)}<p id="catalogStatus" class="shell catalog-status" role="status" hidden></p><section class="shell seo-product" id="seoProductContent"><div class="seo-product-image">${imageMarkup(product, { priority: true, width: 960 })}</div><div class="seo-product-copy">${product.category ? `<p class="overline"><a href="${escape(categoryPath(product.category))}">${escape(product.category)}</a></p>` : ''}<h1>${escape(product.name)}</h1><p class="detail-price" data-seo-price>${escape(money(product.price))}</p><p data-seo-stock>${escape(stockText(product))}</p><p class="seo-description">${escape(description)}</p>${attributes.length ? `<dl class="seo-attributes">${attributes.map(([name, value]) => `<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>` : ''}<button type="button" class="btn btn-dark" data-view="${escape(product.id)}"${availability(product) === 'OutOfStock' ? ' disabled' : ''}>${availability(product) === 'OutOfStock' ? 'RUPTURE DE STOCK' : 'CHOISIR MES OPTIONS →'}</button><p class="seo-stock-note">Paiement à la livraison en Tunisie. Le montant final et les frais de livraison sont confirmés par la boutique.</p><noscript><p>Pour choisir une taille ou commander, activez JavaScript. Les informations produit restent consultables sur cette page.</p></noscript></div></section>${related.length ? `<section class="shell collection"><h2>Autres produits ${escape(product.category || 'Sportifano')}</h2><div class="product-grid">${related.map(productCard).join('')}</div></section>` : ''}</main>` };
}

function productData(product, config) {
  const canonical = config.baseUrl + productPath(product.id);
  const image = imageUrl(product.image, 1200);
  const data = { '@context': 'https://schema.org', '@type': 'Product', '@id': canonical + '#product', name: product.name, url: canonical, sku: product.id, description: product.description || `Informations et options disponibles pour ${product.name} chez Sportifano.`, ...(product.category ? { category: product.category } : {}), ...(image ? { image: [new URL(image, config.baseUrl).href] } : {}) };
  if (validPrice(product.price)) data.offers = { '@type': 'Offer', url: canonical, priceCurrency: 'TND', price: Number(product.price).toFixed(3), seller: { '@type': 'Organization', name: config.name, url: config.baseUrl + '/' }, ...(availability(product) ? { availability: 'https://schema.org/' + availability(product) } : {}) };
  return data;
}

function publicDate(value) {
  if (value && typeof value === 'object') value = value.seconds ? value.seconds * 1000 : null;
  const date = new Date(Number(value));
  return Number(value) > 0 && Number.isFinite(date.getTime()) && date.getTime() <= Date.now() + 86400000 ? date.toISOString() : null;
}

async function copyAssets(source, target) {
  let entries;
  try { entries = await readdir(source, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  await mkdir(target, { recursive: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error('Les assets ne doivent pas contenir de liens symboliques.');
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyAssets(from, to);
    else if (entry.isFile()) await copyFile(from, to);
  }
}

async function prepareOutput(rootDir, outDir) {
  if (outDir === rootDir || rootDir.startsWith(outDir + path.sep)) throw new Error('Le dossier de sortie ne doit pas remplacer le dépôt ou un de ses parents.');
  try {
    const stat = await lstat(outDir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Le dossier de sortie doit être un répertoire réel.');
    const entries = await readdir(outDir);
    if (entries.length && !entries.includes(MARKER)) throw new Error('Le dossier de sortie contient des fichiers non gérés ; choisissez un dossier vide.');
    await rm(outDir, { recursive: true, force: true });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, MARKER), 'Generated public static site. Safe to rebuild.\n');
}

export async function buildSite({ rootDir = ROOT, outDir = path.join(rootDir, 'dist'), data, baseUrl, now = new Date() } = {}) {
  rootDir = path.resolve(rootDir); outDir = path.resolve(outDir);
  const config = JSON.parse(await readFile(path.join(rootDir, 'seo.config.json'), 'utf8'));
  config.baseUrl = (baseUrl || config.baseUrl).replace(/\/+$/, '');
  const origin = new URL(config.baseUrl);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash) throw new Error('baseUrl doit être une origine HTTPS sans chemin.');
  const canonicalHost = (await readFile(path.join(rootDir, 'CNAME'), 'utf8')).trim();
  if (!baseUrl && origin.hostname !== canonicalHost) throw new Error('Le domaine SEO et CNAME ne correspondent pas.');
  const template = await readFile(path.join(rootDir, 'index.html'), 'utf8');
  if (!/<main\b/.test(template) || !/<\/main>/.test(template)) throw new Error('Le template accueil ne contient pas de main.');
  const { products, settings } = normalizeData(data ?? await fetchPublicCatalog(rootDir));
  const names = [...new Set([...(config.defaultCategories || []), ...products.map(product => product.category).filter(Boolean)])];
  const categories = names.map(name => ({ name, populated: products.some(product => product.category === name) }));
  const runtime = await Promise.all(RUNTIME_FILES.map(async name => [name, await readFile(path.join(rootDir, name))]));
  await prepareOutput(rootDir, outDir);
  for (const [name, content] of runtime) await writeFile(path.join(outDir, name), content);
  await copyAssets(path.join(rootDir, 'assets'), path.join(outDir, 'assets'));
  await writeFile(path.join(outDir, '.nojekyll'), '');
  const baseShell = shell(template, categories, settings);
  const first = products.find(product => imageUrl(product.image));
  const image = first ? new URL(imageUrl(first.image, 1200), config.baseUrl).href : '';
  const organization = { '@context': 'https://schema.org', '@type': 'Organization', '@id': config.baseUrl + '/#organization', name: config.name, url: config.baseUrl + '/', slogan: config.slogan, ...(settings.phone && /^[+\d ()-]{6,30}$/.test(settings.phone) ? { telephone: settings.phone } : {}), ...(settings.instagram && /^https:\/\//i.test(settings.instagram) ? { sameAs: [settings.instagram] } : {}) };
  let home = withBody(baseShell, 'home');
  home = replaceContents(home, 'productGrid', products.length ? products.map(productCard).join('') : '<p class="muted">Le catalogue ne contient actuellement aucun produit visible.</p>');
  home = home.replace(/<div\b[^>]*id=["']filters["'][^>]*>[\s\S]*?<\/div>/i, categoryToolbar(categories).match(/<nav\b[\s\S]*?<\/nav>/)?.[0] || '');
  if (first) {
    home = replaceContents(home, 'heroProductImage', imageMarkup(first, { priority: true, width: 1280, className: 'hero-product-png' }));
    for (const [id, value, tag] of [['heroProductCategory', first.category || 'COLLECTION SPORTIFANO', 'span'], ['heroProductName', first.name, 'h2'], ['heroProductDescription', first.description || 'Découvrez les options disponibles pour cet article.', 'p'], ['heroProductPrice', money(first.price), 'strong']]) home = replaceContents(home, id, escape(value), tag);
    home = home.replace(/(<button\b[^>]*id=["']heroProductDetails["'])/i, (_all, prefix) => `${prefix} data-view="${escape(first.id)}"`);
  }
  home = withMetadata(home, { title: config.title, description: config.description, canonical: config.baseUrl + '/', image, structured: [organization, { '@context': 'https://schema.org', '@type': 'WebSite', '@id': config.baseUrl + '/#website', name: config.name, url: config.baseUrl + '/', inLanguage: 'fr-TN', publisher: { '@id': organization['@id'] } }] });
  await writeFile(path.join(outDir, 'index.html'), home);
  const sitemap = [{ path: '/' }];
  const productTitles = new Map();
  for (const product of products) productTitles.set(product.name.toLocaleLowerCase('fr'), (productTitles.get(product.name.toLocaleLowerCase('fr')) || 0) + 1);
  for (const product of products) {
    const pathname = productPath(product.id);
    const related = products.filter(item => item.id !== product.id && item.category === product.category).slice(0, 4);
    const { html: main, crumbs } = productMain(product, related, config.baseUrl);
    let page = withBody(baseShell.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, () => main), 'product', { 'product-id': product.id });
    const title = `${product.name}${productTitles.get(product.name.toLocaleLowerCase('fr')) > 1 ? ' · Réf. ' + product.id : ''} | Sportifano Tunisie`;
    const description = clip(product.description || `${product.name}${product.category ? ' — ' + product.category : ''}. Consultez le prix, les options et la disponibilité chez Sportifano en Tunisie.`);
    const productImage = imageUrl(product.image, 1200);
    page = withMetadata(page, { title, description, canonical: config.baseUrl + pathname, image: productImage ? new URL(productImage, config.baseUrl).href : '', type: 'product', structured: [productData(product, config), breadcrumbData(crumbs, config.baseUrl)] });
    const directory = path.join(outDir, decodeURIComponent(pathname));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), page);
    sitemap.push({ path: pathname, lastmod: publicDate(product.updatedAt || product.createdAt) });
  }
  for (const category of categories) {
    const items = products.filter(product => product.category === category.name);
    const pathname = categoryPath(category.name);
    const description = `Découvrez la collection ${category.name} de Sportifano en Tunisie. Consultez les produits, prix et options disponibles, puis commandez avec paiement à la livraison.`;
    const crumbs = [{ name: 'Accueil', path: '/' }, { name: category.name, path: pathname }];
    const main = `<main class="seo-main">${breadcrumbs(crumbs)}<section class="shell collection" id="catalogue"><p id="catalogStatus" class="catalog-status" role="status" hidden></p><div class="section-top"><div><span class="overline">COLLECTION SPORTIFANO</span><h1>${escape(category.name)} — collection sport en Tunisie</h1></div></div><p class="seo-intro">${escape(description)}</p>${categoryToolbar(categories, category.name)}<div class="product-grid" id="productGrid">${items.length ? items.map(productCard).join('') : '<p class="muted">Aucun produit visible dans cette collection pour le moment.</p>'}</div><div id="emptyProducts" class="empty hidden">Aucun produit trouvé.</div></section></main>`;
    let page = withBody(baseShell.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, () => main), 'category', { category: category.name });
    page = withMetadata(page, { title: `${category.name} : collection sport en Tunisie | Sportifano`, description: clip(description), canonical: config.baseUrl + pathname, noindex: !items.length, image: items[0] && imageUrl(items[0].image) ? new URL(imageUrl(items[0].image, 1200), config.baseUrl).href : '', structured: [breadcrumbData(crumbs, config.baseUrl), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: category.name, url: config.baseUrl + pathname, mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.map((product, index) => ({ '@type': 'ListItem', position: index + 1, name: product.name, url: config.baseUrl + productPath(product.id) })) } }] });
    const directory = path.join(outDir, decodeURIComponent(pathname));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), page);
    if (items.length) sitemap.push({ path: pathname });
  }
  const telephone = settings.phone && /^[+\d ()-]{6,30}$/.test(settings.phone) ? settings.phone : '';
  const instagram = settings.instagram && /^https:\/\//i.test(settings.instagram) ? settings.instagram : '';
  const information = [
    { path: '/contact/', title: 'Contact Sportifano | Boutique de sport en Tunisie', heading: 'Contacter Sportifano', description: 'Contactez la boutique Sportifano pour vos questions sur les produits et vos commandes en Tunisie.', content: `<p>Une question sur un produit, une taille, une disponibilité ou une commande ? Contactez la boutique avec les coordonnées affichées ci-dessous.</p>${telephone || instagram ? `<ul>${telephone ? `<li>Téléphone : <a href="tel:${escape(telephone.replace(/[^+\d]/g, ''))}">${escape(telephone)}</a></li>` : ''}${instagram ? `<li><a href="${escape(instagram)}" target="_blank" rel="noopener noreferrer">Retrouver Sportifano sur Instagram</a></li>` : ''}</ul>` : '<p>Les coordonnées ne sont pas encore renseignées. Consultez les informations affichées par la boutique avant de commander.</p>'}<p>Pour préparer votre demande, indiquez le nom du produit ou la référence de votre commande. Ne communiquez jamais votre mot de passe.</p>` },
    { path: '/livraison/', title: 'Livraison et paiement à la livraison en Tunisie | Sportifano', heading: 'Livraison et paiement en Tunisie', description: 'Informations Sportifano sur la livraison en Tunisie, le paiement à la livraison et les étapes de commande.', content: `<h2>Livraison en Tunisie</h2><p>Sportifano propose la livraison en Tunisie à l’adresse renseignée lors de la commande. Les frais sont affichés dans le formulaire avant confirmation et le montant final est confirmé par la boutique.</p><p>Le délai et la disponibilité pour votre adresse doivent être confirmés avec la boutique. Aucun délai universel n’est annoncé sur cette page.</p><h2>Paiement à la livraison</h2><p>Le paiement se fait à la livraison. Le site ne propose pas de paiement en ligne.</p><h2>Comment commander ?</h2><ol><li>Ouvrez la fiche du produit et choisissez les options disponibles.</li><li>Ajoutez le produit au panier, puis cliquez sur « Passer commande ».</li><li>Connectez-vous ou créez votre compte, puis renseignez vos coordonnées et votre adresse.</li><li>Vérifiez les produits, le sous-total et les frais de livraison affichés avant de confirmer.</li></ol><p>Pour une question sur une commande, <a href="/contact/">contactez Sportifano</a>.</p>` }
  ];
  for (const info of information) {
    const crumbs = [{ name: 'Accueil', path: '/' }, { name: info.heading, path: info.path }];
    const main = `<main class="seo-main">${breadcrumbs(crumbs)}<section class="shell seo-info"><h1>${escape(info.heading)}</h1>${info.content}<p><a href="/#catalogue">Découvrir les produits Sportifano →</a></p></section></main>`;
    let page = withBody(baseShell.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, () => main), 'info');
    page = withMetadata(page, { title: info.title, description: info.description, canonical: config.baseUrl + info.path, structured: [breadcrumbData(crumbs, config.baseUrl)] });
    const directory = path.join(outDir, info.path);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), page);
    sitemap.push({ path: info.path });
  }
  const adminPath = path.join(outDir, 'admin.html');
  let admin = await readFile(adminPath, 'utf8');
  if (!/<meta\b[^>]*name=["']robots["']/i.test(admin)) admin = admin.replace(/<\/head>/i, '<meta name="robots" content="noindex,nofollow"></head>');
  await writeFile(adminPath, admin);
  await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.baseUrl}/sitemap.xml\n`);
  await writeFile(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(item => `  <url><loc>${escape(config.baseUrl + item.path)}</loc>${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
  const notFound = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page introuvable | Sportifano</title><link rel="stylesheet" href="/style.css"></head><body><main class="shell collection"><h1>Cette page est introuvable</h1><p>Le produit a peut-être été retiré ou son adresse a changé.</p><a class="btn btn-dark" href="/">Retour à la boutique Sportifano</a></main></body></html>';
  await writeFile(path.join(outDir, '404.html'), notFound);
  const manifest = { sourceCommit: process.env.GITHUB_SHA || null, generatedAt: new Date(now).toISOString(), products: products.length, categories: categories.length, indexableCategories: categories.filter(category => category.populated).length, sitemapUrls: sitemap.length, baseUrl: config.baseUrl };
  await writeFile(path.join(outDir, 'catalogue.json'), JSON.stringify({ generatedAt: manifest.generatedAt, products, settings }));
  await writeFile(path.join(outDir, 'seo-build.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (!['--data', '--out', '--base-url'].includes(args[i]) || !args[i + 1]) throw new Error('Usage : node scripts/build-seo.mjs [--data catalogue.json] [--out dist] [--base-url https://example.com]');
    options[args[i].slice(2)] = args[++i];
  }
  const data = options.data ? JSON.parse(await readFile(path.resolve(options.data), 'utf8')) : undefined;
  const manifest = await buildSite({ data, outDir: options.out ? path.resolve(options.out) : undefined, baseUrl: options['base-url'] });
  console.log(JSON.stringify(manifest, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error('SEO build failed:', error.message); process.exitCode = 1; });
