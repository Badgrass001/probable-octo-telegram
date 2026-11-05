// Accès à Wikipédia en français : liste des voies, résolution d'un nom de rue, article structuré.
import { norm, stripParis, isVoieTitle, store, sentences } from './util.js';

const API = 'https://fr.wikipedia.org/w/api.php';
const REST = 'https://fr.wikipedia.org/api/rest_v1';
export const WIKI = 'https://fr.wikipedia.org/wiki/';
export const LIST_PAGE = 'Liste des voies du 16e arrondissement de Paris';

const mem = new Map();

async function api(params) {
  const url = new URL(API);
  const all = { format: 'json', formatversion: '2', origin: '*', ...params };
  for (const [k, v] of Object.entries(all)) url.searchParams.set(k, v);
  const key = url.toString();
  if (mem.has(key)) return mem.get(key);
  const p = fetch(key).then(r => {
    if (!r.ok) throw new Error('Wikipédia ne répond pas (' + r.status + ')');
    return r.json();
  }).then(j => {
    if (j.error) throw new Error(j.error.info || 'Erreur Wikipédia');
    return j;
  });
  mem.set(key, p);
  p.catch(() => mem.delete(key));
  return p;
}

export const wikiUrl = title => WIKI + encodeURIComponent(title.replace(/ /g, '_'));

/* ---------------------------------------------------------------- Liste des voies du 16e */

let listPromise = null;

/** Titres Wikipédia de toutes les voies du 16e (mis en cache 14 jours). */
export function loadVoieList() {
  if (listPromise) return listPromise;
  const cached = store.get('voies16', null);
  if (cached && Date.now() - cached.t < 14 * 864e5 && cached.titles?.length > 50) {
    listPromise = Promise.resolve(cached.titles);
    return listPromise;
  }
  listPromise = api({ action: 'parse', page: LIST_PAGE, prop: 'links', redirects: 1 })
    .then(j => {
      const titles = [...new Set(
        (j.parse.links || [])
          .filter(l => l.ns === 0 && l.exists !== false && isVoieTitle(l.title))
          .map(l => l.title)
      )].sort((a, b) => stripParis(a).localeCompare(stripParis(b), 'fr'));
      if (titles.length) store.set('voies16', { t: Date.now(), titles });
      return titles;
    })
    .catch(err => { listPromise = null; console.warn(err); return cached?.titles || []; });
  return listPromise;
}

/* ---------------------------------------------------------------- Résolution d'un nom de rue */

const tokens = s => norm(s).split(' ').filter(w => w.length > 2 || /^\d+$/.test(w));

function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach(w => { if (B.has(w)) inter++; });
  return inter / Math.max(A.size, B.size);
}

/**
 * Trouve le titre de l'article Wikipédia correspondant à un nom de voie
 * (tel que renvoyé par OpenStreetMap, ou saisi par l'utilisateur).
 */
export async function resolveTitle(name) {
  const key = norm(stripParis(name));
  const list = await loadVoieList();
  const hit = list.find(t => norm(stripParis(t)) === key);
  if (hit) return hit;

  const j = await api({
    action: 'query', list: 'search', srnamespace: 0, srlimit: 10,
    srsearch: `${name} Paris 16e arrondissement`,
  });
  const hits = (j.query?.search || []).map(s => s.title);
  const exact = hits.find(t => norm(stripParis(t)) === key);
  if (exact) return exact;

  let best = null, bestScore = 0;
  for (const t of hits) {
    if (!isVoieTitle(t)) continue;
    const sc = similarity(stripParis(t), name);
    if (sc > bestScore) { best = t; bestScore = sc; }
  }
  return bestScore >= 0.75 ? best : null;
}

/* ---------------------------------------------------------------- Article structuré */

const JUNK = [
  'script', 'style', 'link', 'meta', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  '.mw-editsection', 'sup.reference', '.reference', '.mw-references-wrap', 'ol.references', '.references',
  '.bandeau-container', '.bandeau-section', '.bandeau', '.homonymie', '.hatnote', '.dablink', '.ambox',
  '.navbox', '.navbox-container', '.navigation-only', '.metadata', '.noprint', '.printfooter', '.catlinks',
  '.portail', '.bandeau-portail', '.autres-projets', '.mw-empty-elt', '.mwe-math-mathml-a11y',
  '.geobox', '.mw-kartographer-maplink', '.mw-kartographer-map', '.toc', '#toc', '.mw-cite-backlink',
  '.Article-de-qualite', '.need_ref', '.plainlinks.liste-horizontale', '.indicator',
];

const SKIP_SECTIONS = /^(notes?|r[ée]f[ée]rences?|notes et r[ée]f[ée]rences|sources?|annexes?|articles? connexes|liens? externes?|bibliographie|voir aussi|galerie d'images)\b/i;

export const KINDS = [
  { kind: 'situation', re: /situation|acc[èe]s|localisation|desserte|transports?/i, label: 'Situation et accès' },
  { kind: 'origine', re: /origine|nom\b|d[ée]nomination|[ée]tymolog/i, label: 'Origine du nom' },
  { kind: 'historique', re: /histori|histoire/i, label: 'Historique' },
  { kind: 'batiments', re: /b[âa]timents?|lieux de m[ée]moire|remarquable|monuments?|patrimoine|architecture|[ée]difices?/i, label: 'Bâtiments remarquables' },
  { kind: 'personnalites', re: /personnalit|habitants?|r[ée]sidents?|c[ée]l[ée]brit/i, label: 'Personnalités' },
  { kind: 'culture', re: /culture|fiction|cin[ée]ma|films?|litt[ée]ratur|peinture|arts?\b|musique|chanson|t[ée]l[ée]vision|repr[ée]sentation/i, label: 'Dans la culture' },
];

const kindOf = title => (KINDS.find(k => k.re.test(title)) || { kind: 'autre' }).kind;

function headingLevel(el) {
  if (/^H[2-6]$/.test(el.tagName)) return +el.tagName[1];
  if (el.classList?.contains('mw-heading')) {
    const h = el.querySelector('h2,h3,h4,h5,h6');
    return h ? +h.tagName[1] : 0;
  }
  return 0;
}
const headingText = el => (el.querySelector?.('h2,h3,h4,h5,h6') || el).textContent.replace(/\[\s*modifier[^\]]*\]/gi, '').trim();

function hiRes(src, width = 900) {
  if (!src) return src;
  if (src.startsWith('//')) src = 'https:' + src;
  return /\/thumb\//.test(src) ? src.replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`) : src;
}

function sanitize(root) {
  root.querySelectorAll(JUNK.join(',')).forEach(n => n.remove());
  root.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      if (n.startsWith('on') || n === 'style' || n === 'about' || n === 'typeof' || n === 'data-mw') el.removeAttribute(attr.name);
    }
  });
  // Liens
  root.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (a.classList.contains('new') || /^\s*javascript:/i.test(href) || (!href && !a.id)) { a.replaceWith(...a.childNodes); return; }
    if (href.startsWith('#cite')) { a.replaceWith(...a.childNodes); return; }
    if (href.startsWith('/wiki/') || href.startsWith('./')) {
      const path = href.replace(/^\.\//, '/wiki/');
      const title = decodeURIComponent(path.slice(6).split('#')[0]).replace(/_/g, ' ');
      a.setAttribute('href', 'https://fr.wikipedia.org' + path);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      if (!/^(Fichier|File|Image|Aide|Help|Sp[ée]cial|Special|Cat[ée]gorie|Category|Portail|Mod[èe]le|Wikip[ée]dia|Projet|Discussion|Utilisateur):/i.test(title)
          && !a.querySelector('img')) a.dataset.wiki = title;
    } else if (href.startsWith('//')) {
      a.setAttribute('href', 'https:' + href); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
    } else if (/^https?:/i.test(href)) {
      a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); a.classList.add('ext');
    } else if (href.startsWith('/')) {
      a.setAttribute('href', 'https://fr.wikipedia.org' + href); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
    }
  });
  // Images
  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src?.startsWith('//')) img.setAttribute('src', 'https:' + src);
    const srcset = img.getAttribute('srcset');
    if (srcset) img.setAttribute('srcset', srcset.replace(/(^|,\s*)\/\//g, '$1https://'));
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.removeAttribute('width'); img.removeAttribute('height');
    const w = +(img.dataset.fileWidth || img.getAttribute('data-file-width') || 0);
    if (w && w < 40) img.classList.add('inline-icon');
  });
  // Tableaux défilables
  root.querySelectorAll('table').forEach(t => {
    if (t.parentElement?.classList.contains('table-wrap')) return;
    const wrap = root.ownerDocument.createElement('div');
    wrap.className = 'table-wrap';
    t.replaceWith(wrap); wrap.appendChild(t);
  });
}

const FACT_KEYS = [
  { key: 'creation', re: /^cr[ée]ation/i, label: 'Création' },
  { key: 'denomination', re: /^d[ée]nomination/i, label: 'Dénomination' },
  { key: 'anciens', re: /^anciens? noms?/i, label: 'Anciens noms' },
  { key: 'arrondissement', re: /^arrondissements?/i, label: 'Arrondissement' },
  { key: 'quartier', re: /^quartiers?/i, label: 'Quartier' },
  { key: 'debut', re: /^d[ée]but/i, label: 'Début' },
  { key: 'fin', re: /^fin\b/i, label: 'Fin' },
  { key: 'longueur', re: /^longueur/i, label: 'Longueur' },
  { key: 'largeur', re: /^largeur/i, label: 'Largeur' },
];
const IGNORE_ROWS = /g[ée]ocod|^dgi|coordonn|g[ée]olocalisation|commons|^code|^pays|^ville|^r[ée]gion|^d[ée]partement|^commune/i;

function parseInfobox(root) {
  const box = root.querySelector('.infobox_v3, .infobox_v2, table.infobox, .infobox');
  if (!box) return null;
  const facts = [], extra = [];
  box.querySelectorAll('tr').forEach(tr => {
    const th = tr.querySelector('th'), td = tr.querySelector('td');
    if (!th || !td) return;
    const label = th.textContent.replace(/\s+/g, ' ').trim();
    const html = td.innerHTML.replace(/<br\s*\/?>/gi, ' · ').trim();
    const text = td.textContent.replace(/\s+/g, ' ').trim();
    if (!label || !text || IGNORE_ROWS.test(label)) return;
    const def = FACT_KEYS.find(f => f.re.test(label));
    (def ? facts : extra).push({ key: def?.key || null, label: def?.label || label, html, text });
  });
  facts.sort((a, b) => FACT_KEYS.findIndex(f => f.key === a.key) - FACT_KEYS.findIndex(f => f.key === b.key));

  let image = null;
  const img = [...box.querySelectorAll('img')].find(i => {
    const src = i.getAttribute('src') || '';
    const fw = +(i.getAttribute('data-file-width') || 0);
    return !i.closest('.geobox, .locmap, .mw-kartographer-container, .infobox-carte')
      && !/location[_ ]map|locator|carte|blank|logo|flag|drapeau|blason|icon|picto|pog|\.svg/i.test(src)
      && (!fw || fw > 150);
  });
  if (img) {
    const cap = img.closest('.images, figure, .thumb, td, div')?.querySelector('.legend, figcaption, .thumbcaption');
    image = { src: hiRes(img.getAttribute('src')), caption: cap?.textContent.trim() || img.getAttribute('alt') || '' };
  }
  box.remove();
  return { facts, extra, image };
}

function flatten(node, out = []) {
  for (const ch of node.children) {
    if (ch.tagName === 'SECTION') flatten(ch, out);
    else out.push(ch);
  }
  return out;
}

/** Charge l'article et le découpe en fiche (infobox), introduction et sections thématiques. */
export async function fetchArticle(title) {
  const [parsed, meta] = await Promise.all([
    api({ action: 'parse', page: title, prop: 'text|displaytitle', redirects: 1, disableeditsection: 1, disabletoc: 1 }),
    api({ action: 'query', prop: 'coordinates|pageimages|description', titles: title, redirects: 1, piprop: 'thumbnail', pithumbsize: 900 })
      .catch(() => null),
  ]);
  const realTitle = parsed.parse.title;
  const doc = new DOMParser().parseFromString(`<div id="root">${parsed.parse.text}</div>`, 'text/html');
  const root = doc.querySelector('.mw-parser-output') || doc.getElementById('root');

  sanitize(root);
  const infobox = parseInfobox(root);

  const blocks = flatten(root);
  const intro = [];
  const sections = [];
  let cur = null;
  for (const el of blocks) {
    const lvl = headingLevel(el);
    if (lvl === 2) {
      const t = headingText(el);
      cur = { title: t, kind: kindOf(t), parts: [], skip: SKIP_SECTIONS.test(t) };
      sections.push(cur);
      continue;
    }
    if (lvl > 2) {
      const t = headingText(el);
      if (cur) cur.parts.push(`<h${Math.min(lvl + 1, 6)} class="sub">${t.replace(/</g, '&lt;')}</h${Math.min(lvl + 1, 6)}>`);
      continue;
    }
    if (!el.textContent.trim() && !el.querySelector('img')) continue;
    (cur ? cur.parts : intro).push(el.outerHTML);
  }

  const page = meta?.query?.pages?.[0] || {};
  const coord = page.coordinates?.[0];
  const introText = intro.map(h => h.replace(/<[^>]+>/g, ' ')).join(' ').replace(/\s+/g, ' ').trim();

  return {
    title: realTitle,
    name: stripParis(realTitle),
    url: wikiUrl(realTitle),
    description: page.description || '',
    lede: sentences(introText).slice(0, 2).join(' '),
    infobox,
    image: infobox?.image || (page.thumbnail ? { src: page.thumbnail.source, caption: '' } : null),
    coords: coord ? { lat: coord.lat, lon: coord.lon } : null,
    intro: intro.join(''),
    sections: sections.filter(s => !s.skip && s.parts.length).map((s, i) => ({ ...s, id: `sec-${i}`, html: s.parts.join('') })),
  };
}

/** Résumé court d'un article (pour l'aperçu des liens). */
export async function fetchSummary(title) {
  const key = 'sum:' + title;
  if (mem.has(key)) return mem.get(key);
  const p = fetch(`${REST}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
    .then(r => { if (!r.ok) throw new Error('Article introuvable'); return r.json(); });
  mem.set(key, p);
  p.catch(() => mem.delete(key));
  return p;
}

/** Recherche plein texte (secours si la liste des voies n'a pas pu être chargée). */
export async function searchVoies(q) {
  const j = await api({ action: 'opensearch', search: q, limit: 15, namespace: 0, formatversion: '1' })
    .catch(() => null);
  return (j?.[1] || []).filter(isVoieTitle);
}
