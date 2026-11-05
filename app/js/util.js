// Petits utilitaires partagés.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Normalise un nom de voie pour comparer « Avenue du Président Kennedy » et « Avenue du Président-Kennedy ». */
export function norm(s = '') {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[-'’`.,]/g, ' ')
    .replace(/\bst\b/g, 'saint').replace(/\bste\b/g, 'sainte')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retire le suffixe d'homonymie « (Paris) » d'un titre Wikipédia. */
export function stripParis(title = '') {
  return title.replace(/\s*\((?:Paris|voie parisienne|Paris \d+e?)[^)]*\)\s*$/i, '').trim();
}

export const VOIE_RE = /^(rue|avenue|boulevard|place|impasse|villa|square|all[ée]e|passage|quai|hameau|cit[ée]|chauss[ée]e|sentier|sente|chemin|cour|porte|rond-point|carrefour|esplanade|promenade|parvis|galerie|ruelle|voie|route|terrasse|petite|grande|jardin|pont|port)\b/i;

export function isVoieTitle(title) {
  return VOIE_RE.test(stripParis(title));
}

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Distance en mètres entre deux points (haversine). */
export function distance(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('flaneur.' + key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('flaneur.' + key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Découpe un texte en phrases (approximatif mais suffisant). */
export function sentences(text) {
  return (text.replace(/\s+/g, ' ').match(/[^.!?…]+(?:[.!?…]+|$)/g) || [])
    .map(s => s.trim())
    .filter(Boolean);
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
