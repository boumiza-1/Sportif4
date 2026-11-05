// Shared between the static build and the live storefront so every product has one stable URL.
export function productPath(id) {
  const key = String(id ?? '');
  if (!key || /[.#$\[\]/\u0000-\u001f\u007f]/u.test(key)) throw new Error('Identifiant produit invalide');
  return '/produits/' + encodeURIComponent(key) + '/';
}

export function categoryPath(name) {
  const value = String(name ?? '').trim();
  const slug = value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'collection';
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return '/collections/' + encodeURIComponent(slug.slice(0, 80) + '-' + (hash >>> 0).toString(16).padStart(8, '0')) + '/';
}

export function imageUrl(value, width = 640) {
  if (typeof value !== 'string') return '';
  if (/^(?:\.\/|\/)assets\/[A-Za-z0-9_./%-]+$/.test(value) && !value.includes('..')) return value.replace(/^\.\//, '/');
  let url;
  try { url = new URL(value); } catch { return ''; }
  if (url.protocol !== 'https:' || url.username || url.password) return '';
  if (url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/')) {
    const size = Math.max(160, Math.min(1600, Math.round(Number(width) || 640)));
    url.pathname = url.pathname.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${size}/`);
  }
  return url.href;
}

export function imageSrcset(value) {
  let url;
  try { url = new URL(value); } catch { return ''; }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.includes('/image/upload/')) return '';
  return [320, 640, 960, 1280].map(width => imageUrl(value, width) + ' ' + width + 'w').join(', ');
}
