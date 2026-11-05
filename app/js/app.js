import { $, $$, norm, stripParis, isVoieTitle, escapeHtml, distance, store, debounce, sentences, formatDate } from './util.js';
import { loadVoieList, resolveTitle, fetchArticle, fetchSummary, searchVoies, wikiUrl, KINDS } from './wiki.js';
import { reverseGeocode, fetchGeometry, CENTER_16, in16 } from './geo.js';

/* =================================================================== Données éditoriales */

const COUPS_DE_COEUR = [
  { title: 'Rue Mallet-Stevens', teaser: 'Une rue entière dessinée par un architecte moderniste, en 1927.' },
  { title: 'Rue La Fontaine', teaser: 'Le Castel Béranger d’Hector Guimard, manifeste de l’Art nouveau.' },
  { title: 'Rue Berton', teaser: 'Un chemin de village pavé, à l’arrière de la maison de Balzac.' },
  { title: 'Avenue Foch', teaser: 'L’ancienne avenue de l’Impératrice, la plus large de Paris.' },
  { title: 'Hameau Boileau', teaser: 'Un hameau privé, hors du temps, au cœur d’Auteuil.' },
  { title: 'Rue Raynouard', teaser: 'La colline de Passy, Balzac et le souvenir de Benjamin Franklin.' },
  { title: 'Rue d\'Auteuil', teaser: 'La grand-rue de l’ancien village d’Auteuil, rattaché à Paris en 1860.' },
  { title: 'Place du Trocadéro-et-du-11-Novembre', teaser: 'Le plus célèbre balcon sur la tour Eiffel.' },
];

const THEMES = [
  { id: 'personnalites', label: 'Personnalités', re: /\b(habit[ée]|a v[ée]cu|aurait v[ée]cu|v[ée]cut|y (?:a )?v[ée]cu|y v[ée]cut|y (?:est )?(?:n[ée]e?|mort|morte|d[ée]c[ée]d[ée]e?)|demeur|r[ée]sid|domicile|s'y install|y meurt|y naqu)/i },
  { id: 'architecture', label: 'Architecture', re: /architecte|art nouveau|art d[ée]co|h[ôo]tel particulier|fa[çc]ade|monument historique|class[ée]e? |inscrit|style |moderniste|immeuble/i },
  { id: 'cinema', label: 'Cinéma', re: /cin[ée]ma|\bfilms?\b|tourn[ée]|tournage|r[ée]alisateur|cin[ée]aste|t[ée]l[ée]vis/i },
  { id: 'litterature', label: 'Littérature', re: /roman|[ée]crivain|po[èe]te|po[èe]me|litt[ée]r|romanci|dramaturge|biblioth|acad[ée]mie fran[çc]aise/i },
  { id: 'arts', label: 'Peinture & arts', re: /peintre|peinture|tableau|toile|sculpt|atelier|mus[ée]e|graveur|photograph/i },
  { id: 'musique', label: 'Musique', re: /musicien|compositeur|chanteu|chanson|op[ée]ra|pianiste|violon|orchestre/i },
  { id: 'memoire', label: 'Mémoire', re: /plaque comm[ée]morative|comm[ée]mor|r[ée]sistan|d[ée]port[ée]|fusill[ée]|guerre|occupation|lib[ée]ration|monument aux morts|m[ée]morial/i },
];

const BADGES = [
  { n: 1, label: 'Premier pas', desc: 'Votre première voie découverte' },
  { n: 5, label: 'Promeneur', desc: '5 voies découvertes' },
  { n: 15, label: 'Flâneur', desc: '15 voies découvertes' },
  { n: 40, label: 'Arpenteur', desc: '40 voies découvertes' },
  { n: 100, label: 'Érudit de Passy', desc: '100 voies découvertes' },
  { n: 250, label: 'Mémoire du 16e', desc: '250 voies découvertes' },
];

/* =================================================================== Icônes */

const ICONS = {
  situation: '<path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  origine: '<path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
  historique: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  batiments: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M9 12h.01M15 12h.01"/>',
  personnalites: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  culture: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>',
  autre: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  wiki: '<path d="M3 6h5M16 6h5M4.5 6l4 12 3.5-9 3.5 9 4-12"/>',
  pano: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  lamp: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  steps: '<path d="M12 2.5 5 20.5l7-3.2 7 3.2z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.autre}</svg>`;

/* =================================================================== État */

const state = {
  map: null,
  tiles: null,
  me: null, meHalo: null,
  streetLayer: null,
  pinLayer: null,
  watchId: null,
  following: false,
  lastPos: null,
  lastGeo: { pos: null, t: 0 },
  geoBusy: false,
  candidate: null,
  current: null, // { name, title, source }
  loadToken: 0,
  voice: store.get('voice', false),
  journal: store.get('journal', {}),
  userPanned: 0,
  article: null,
};

/* =================================================================== Carte */

function initMap() {
  const map = L.map('map', { zoomControl: false, attributionControl: true, tap: true })
    .setView(CENTER_16, 14);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  state.map = map;
  setTiles();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', setTiles);

  state.streetLayer = L.layerGroup().addTo(map);
  state.pinLayer = L.layerGroup().addTo(map);

  map.on('click', e => exploreAt(e.latlng.lat, e.latlng.lng));
  map.on('dragstart', () => { state.userPanned = Date.now(); });
}

function setTiles() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  if (state.tiles) state.map.removeLayer(state.tiles);
  state.tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`, {
    maxZoom: 20, subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
  }).addTo(state.map);
}

function drawStreet(lines, fit) {
  state.streetLayer.clearLayers();
  if (!lines?.length) return;
  for (const l of lines) {
    L.polyline(l, { color: '#fff', weight: 11, opacity: .85, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(state.streetLayer);
  }
  for (const l of lines) {
    L.polyline(l, { color: '#1c3366', weight: 6, opacity: .95, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(state.streetLayer);
  }
  if (fit) {
    const b = L.latLngBounds(lines.flat());
    state.map.flyToBounds(b, { padding: [40, 40], maxZoom: 17, duration: .8 });
  }
}

function dropPin(lat, lon) {
  state.pinLayer.clearLayers();
  L.marker([lat, lon], {
    icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 22] }),
    interactive: false,
  }).addTo(state.pinLayer);
}

/* =================================================================== Géolocalisation */

function setPill(kind, text) {
  const pill = $('#gps-pill');
  pill.dataset.state = kind;
  $('.txt', pill).textContent = text;
}

function startTracking() {
  if (!('geolocation' in navigator)) { toast('La géolocalisation n’est pas disponible sur cet appareil.'); return; }
  state.following = true;
  $('#btn-locate').classList.add('active');
  setPill('search', 'Recherche de votre position…');
  if (state.lastPos) centerOnMe();
  if (state.watchId != null) return;
  state.watchId = navigator.geolocation.watchPosition(onPosition, onGeoError, {
    enableHighAccuracy: true, maximumAge: 4000, timeout: 20000,
  });
}

function stopFollowing() {
  state.following = false;
  $('#btn-locate').classList.remove('active');
  if (state.watchId != null) setPill('idle', 'Exploration libre · touchez ◎ pour reprendre');
}

function onGeoError(err) {
  if (err.code === 1) {
    navigator.geolocation.clearWatch(state.watchId); state.watchId = null;
    state.following = false;
    $('#btn-locate').classList.remove('active');
    setPill('error', 'Géolocalisation refusée');
    toast('Autorisez la localisation dans les réglages de votre navigateur pour suivre votre promenade. En attendant, touchez la carte pour explorer.');
  } else {
    setPill('error', 'Position introuvable pour l’instant…');
  }
}

function centerOnMe() {
  if (!state.lastPos) return;
  const { lat, lon } = state.lastPos;
  state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 17), { duration: .7 });
}

async function onPosition(p) {
  const pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
  const first = !state.lastPos;
  state.lastPos = pos;

  const ll = [pos.lat, pos.lon];
  if (!state.me) {
    state.meHalo = L.circle(ll, { radius: pos.acc, color: '#3b6fd8', weight: 1, fillOpacity: .12, interactive: false }).addTo(state.map);
    state.me = L.marker(ll, { icon: L.divIcon({ className: 'me', html: '<span></span>', iconSize: [20, 20] }), interactive: false, zIndexOffset: 1000 }).addTo(state.map);
  } else {
    state.me.setLatLng(ll); state.meHalo.setLatLng(ll).setRadius(pos.acc);
  }

  if (!state.following) return;
  if (first) centerOnMe();
  else if (Date.now() - state.userPanned > 8000) state.map.panTo(ll, { animate: true });

  const inside = in16(pos.lat, pos.lon);
  setPill(inside ? 'ok' : 'warn', inside
    ? `Suivi de votre promenade · ±${Math.round(pos.acc)} m`
    : `Hors du 16e · ±${Math.round(pos.acc)} m`);

  // Limiter les appels au géocodeur : au plus toutes les 4 s, et seulement si l'on a bougé.
  const now = Date.now();
  const moved = state.lastGeo.pos ? distance(state.lastGeo.pos, pos) : Infinity;
  if (state.geoBusy || now - state.lastGeo.t < 4000 || (moved < 10 && !state.candidate)) return;
  state.geoBusy = true;
  state.lastGeo = { pos, t: now };
  try {
    const g = await reverseGeocode(pos.lat, pos.lon);
    if (!state.following || !g.name) return;
    if (state.current && norm(g.name) === norm(state.current.name)) { state.candidate = null; return; }
    // Hystérésis : on confirme une nouvelle rue sur deux lectures (évite les sauts aux carrefours).
    if (state.current && (!state.candidate || norm(state.candidate) !== norm(g.name))) {
      state.candidate = g.name;
      return;
    }
    state.candidate = null;
    arriveIn(g);
  } catch (e) {
    console.warn(e);
  } finally {
    state.geoBusy = false;
  }
}

function arriveIn(g) {
  const reading = $('#panel-scroll').scrollTop > 160 && state.current;
  if (reading) {
    state.current = { name: g.name, title: null, source: 'gps', pending: true };
    toast(`Vous entrez ${withArticle(g.name)}`, { action: 'Découvrir', onAction: () => loadStreet({ name: g.name, source: 'gps', is16: g.is16 }), duration: 9000 });
    if (state.voice) speak(`Vous entrez ${withArticle(g.name)}.`);
    return;
  }
  loadStreet({ name: g.name, source: 'gps', is16: g.is16 });
}

/** « rue de Passy » → « dans la rue de Passy » ; « avenue Foch » → « dans l’avenue Foch ». */
function withArticle(name) {
  const n = name.charAt(0).toLowerCase() + name.slice(1);
  const fem = /^(rue|avenue|place|impasse|villa|all[ée]e|cit[ée]|chauss[ée]e|sente|cour|porte|esplanade|promenade|galerie|ruelle|voie|route|terrasse|petite|grande)\b/i.test(n);
  if (/^[aeéèêiîoôuh]/i.test(n)) return `dans l’${n}`;
  return `dans ${fem ? 'la' : 'le'} ${n}`;
}

async function exploreAt(lat, lon) {
  stopFollowing();
  dropPin(lat, lon);
  renderLoading('…');
  try {
    const g = await reverseGeocode(lat, lon);
    if (!g.name) { renderMessage('Pas de voie ici', 'Aucune rue n’a été trouvée à cet endroit. Essayez de toucher la carte plus près d’une rue.'); return; }
    loadStreet({ name: g.name, source: 'map', is16: g.is16, lat, lon });
  } catch (e) {
    renderMessage('Connexion difficile', 'Impossible de joindre le service de cartographie. Vérifiez votre connexion et réessayez.');
  }
}

/* =================================================================== Chargement d'une voie */

async function loadStreet({ name, title = null, source = 'search', is16 = null, lat = null, lon = null }) {
  const token = ++state.loadToken;
  state.current = { name: name || stripParis(title), title, source };
  renderLoading(name || stripParis(title), is16);

  try {
    if (!title) title = await resolveTitle(name);
    if (token !== state.loadToken) return;
    if (!title) {
      renderNotFound(name, is16);
      geometry(name, source !== 'gps', token);
      return;
    }
    const art = await fetchArticle(title);
    if (token !== state.loadToken) return;
    state.current = { name: art.name, osmName: name, title: art.title, source };
    state.article = art;
    renderArticle(art, { source, is16 });
    document.body.classList.add('has-street');
    record(art, source);
    if (source !== 'gps' && source !== 'map' && art.coords) dropPin(art.coords.lat, art.coords.lon);
    geometry(name || art.name, source !== 'gps', token, art.coords);
    if (source === 'gps' && state.voice) speakArticle(art);
  } catch (e) {
    console.error(e);
    if (token !== state.loadToken) return;
    renderMessage('Wikipédia ne répond pas', 'La fiche n’a pas pu être chargée. Vérifiez votre connexion, puis réessayez.', () => loadStreet({ name, title, source, is16, lat, lon }));
  }
}

async function geometry(name, fit, token, fallback) {
  try {
    let lines = await fetchGeometry(name);
    if (!lines.length && state.current?.name && norm(state.current.name) !== norm(name)) lines = await fetchGeometry(state.current.name);
    if (token !== state.loadToken) return;
    drawStreet(lines, fit && lines.length);
    if (fit && !lines.length && fallback) state.map.flyTo([fallback.lat, fallback.lon], 16, { duration: .8 });
  } catch {
    if (fit && fallback && token === state.loadToken) state.map.flyTo([fallback.lat, fallback.lon], 16, { duration: .8 });
  }
}

/* =================================================================== Rendus */

const panel = () => $('#panel-content');

function splitName(name) {
  const m = name.match(/^(\S+(?:-point)?)\s+(.*)$/);
  return m && isVoieTitle(name) ? { type: m[1], rest: m[2] } : { type: '', rest: name };
}

function plaque(name, arr = '16') {
  const { type, rest } = splitName(name);
  return `
  <div class="plaque" role="heading" aria-level="1" aria-label="${escapeHtml(name)}">
    <div class="plaque-inner">
      <span class="plaque-arr">${arr ? `${escapeHtml(arr)}<sup>e</sup> Arr<sup>t</sup>` : 'Paris'}</span>
      <span class="plaque-name">${type ? `<span class="plaque-type">${escapeHtml(type)}</span> ` : ''}${escapeHtml(rest)}</span>
    </div>
  </div>`;
}

function arrFrom(art, is16) {
  const f = art?.infobox?.facts.find(x => x.key === 'arrondissement');
  const m = f?.text.match(/(\d+)/);
  if (m) return m[1];
  if (is16 === false) return '';
  return '16';
}

function renderWelcome() {
  panel().innerHTML = `
  <div class="welcome">
    <p class="eyebrow">Bienvenue, flâneur</p>
    <h1 class="display">Chaque rue du 16<sup>e</sup> a une histoire.<br><em>Laissez-la vous la raconter.</em></h1>
    <p class="lead">Marchez : Flâneur reconnaît la voie où vous vous trouvez et vous dévoile l’origine de son nom, son histoire, ses bâtiments remarquables, ses habitants célèbres, les films et les livres qui l’ont rendue immortelle.</p>
    <div class="cta-row">
      <button class="btn primary" id="w-locate">${icon('steps')} Commencer la promenade</button>
      <button class="btn ghost" id="w-search">Choisir une voie</button>
    </div>
    <p class="hint-line">Ou touchez simplement une rue sur la carte.</p>

    <h2 class="kicker">Coups de cœur</h2>
    <ul class="coeur">
      ${COUPS_DE_COEUR.map(c => `
        <li><button data-title="${escapeHtml(c.title)}">
          <span class="coeur-name">${escapeHtml(c.title)}</span>
          <span class="coeur-teaser">${escapeHtml(c.teaser)}</span>
          ${icon('chevron', 'chev')}
        </button></li>`).join('')}
    </ul>
    <button class="btn ghost wide" id="w-random">${icon('dice')} Une voie au hasard</button>
    <p class="credits">Contenus issus de <a href="https://fr.wikipedia.org" target="_blank" rel="noopener">Wikipédia</a> (licence CC BY-SA) · Cartographie © OpenStreetMap.</p>
  </div>`;
  $('#w-locate').onclick = startTracking;
  $('#w-search').onclick = openSearch;
  $('#w-random').onclick = randomVoie;
  $$('.coeur button', panel()).forEach(b => b.onclick = () => { stopFollowing(); loadStreet({ title: b.dataset.title, source: 'search' }); });
}

function renderLoading(name, is16) {
  $('#panel-scroll').scrollTop = 0;
  panel().innerHTML = `
    ${plaque(name, is16 === false ? '' : '16')}
    <div class="skeleton">
      <div class="sk sk-img"></div>
      <div class="sk-grid"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
      <div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div>
    </div>`;
}

function renderMessage(title, text, retry) {
  panel().innerHTML = `
    <div class="message">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
      ${retry ? '<button class="btn primary" id="m-retry">Réessayer</button>' : ''}
      <button class="btn ghost" id="m-home">Retour à l’accueil</button>
    </div>`;
  if (retry) $('#m-retry').onclick = retry;
  $('#m-home').onclick = renderWelcome;
}

function renderNotFound(name, is16) {
  const q = encodeURIComponent(`${name} Paris`);
  panel().innerHTML = `
    ${plaque(name, is16 === false ? '' : '16')}
    <div class="message">
      <h2>Une voie encore discrète</h2>
      <p>Wikipédia ne consacre pas (encore) d’article à <strong>${escapeHtml(name)}</strong>${is16 === false ? ', qui se trouve hors du 16<sup>e</sup> arrondissement' : ''}. Continuez votre promenade : la prochaine rue a sûrement beaucoup à raconter.</p>
      <div class="link-row">
        <a class="btn ghost" target="_blank" rel="noopener" href="https://fr.wikipedia.org/w/index.php?search=${q}">${icon('wiki')} Chercher sur Wikipédia</a>
        <a class="btn ghost" target="_blank" rel="noopener" href="https://www.google.com/search?q=${q}+histoire">Chercher sur le web</a>
      </div>
    </div>`;
}

function factTile(f) {
  return `<div class="fact fact-${f.key || 'x'}"><dt>${escapeHtml(f.label)}</dt><dd>${f.html}</dd></div>`;
}

function renderArticle(art, { source, is16 }) {
  const facts = art.infobox?.facts || [];
  const primary = facts.filter(f => ['creation', 'denomination', 'anciens'].includes(f.key));
  const secondary = facts.filter(f => !['creation', 'denomination', 'anciens', 'arrondissement'].includes(f.key));
  const extra = art.infobox?.extra || [];
  const outside = is16 === false || (arrFrom(art) && arrFrom(art) !== '16');
  const order = ['origine', 'historique', 'batiments', 'personnalites', 'culture', 'situation', 'autre'];
  const sections = [...art.sections].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const lat = art.coords?.lat ?? state.lastPos?.lat, lon = art.coords?.lon ?? state.lastPos?.lon;

  panel().innerHTML = `
  <article class="voie">
    ${plaque(art.name, arrFrom(art, is16))}
    <div class="context-line">
      ${source === 'gps' ? `<span class="tag live"><span class="dot"></span>Vous êtes ici</span>` : `<span class="tag">${source === 'map' ? 'Exploration' : 'Lecture'}</span>`}
      ${outside ? '<span class="tag warn">Hors du 16<sup>e</sup></span>' : ''}
      ${art.description ? `<span class="desc">${escapeHtml(art.description)}</span>` : ''}
    </div>

    ${art.image ? `
    <figure class="hero">
      <img src="${escapeHtml(art.image.src)}" alt="${escapeHtml(art.image.caption || art.name)}" loading="eager">
      ${art.image.caption ? `<figcaption>${escapeHtml(art.image.caption)}</figcaption>` : ''}
    </figure>` : ''}

    ${primary.length ? `<dl class="facts primary">${primary.map(factTile).join('')}</dl>` : ''}
    ${secondary.length ? `<dl class="facts">${secondary.map(factTile).join('')}</dl>` : ''}
    ${extra.length ? `<details class="more-facts"><summary>Autres informations</summary><dl class="facts">${extra.map(factTile).join('')}</dl></details>` : ''}

    <div class="themes" id="themes" role="toolbar" aria-label="Explorer par thème"></div>
    <div id="dyk"></div>

    ${art.intro ? `<div class="prose intro">${art.intro}</div>` : ''}

    <nav class="toc" aria-label="Sommaire">
      ${sections.map(s => `<a href="#${s.id}" data-sec="${s.id}">${icon(s.kind)}<span>${escapeHtml(s.title)}</span></a>`).join('')}
    </nav>

    ${sections.map(s => `
      <details class="sec sec-${s.kind}" id="${s.id}" ${['origine', 'historique', 'batiments'].includes(s.kind) ? 'open' : ''}>
        <summary>${icon(s.kind)}<span class="sec-title">${escapeHtml(s.title)}</span>${icon('chevron', 'chev')}</summary>
        <div class="prose">${s.html}</div>
      </details>`).join('')}

    <footer class="voie-foot">
      <div class="link-row">
        <a class="btn ghost" href="${art.url}" target="_blank" rel="noopener">${icon('wiki')} Article complet</a>
        ${lat != null ? `<a class="btn ghost" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}" target="_blank" rel="noopener">${icon('pano')} Street View</a>` : ''}
        <a class="btn ghost" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(art.name + ', Paris')}" target="_blank" rel="noopener">${icon('map')} OpenStreetMap</a>
      </div>
      <p class="credits">Texte : <a href="${art.url}" target="_blank" rel="noopener">« ${escapeHtml(art.title)} »</a>, Wikipédia, licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>.</p>
    </footer>
  </article>`;

  $('#panel-scroll').scrollTop = 0;
  delete document.body.dataset.theme;
  buildThemes();
  buildDidYouKnow(art);
  $$('.toc a', panel()).forEach(a => a.onclick = e => {
    e.preventDefault();
    const sec = document.getElementById(a.dataset.sec);
    sec.open = true;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const hero = $('.hero img', panel());
  if (hero) hero.onerror = () => hero.closest('figure').remove();
}

/* ---------- Thèmes : filtrer les paragraphes et entrées de liste par sujet */

function themeUnits() {
  return $$('.voie .prose > p, .voie .prose li, .voie .prose dd', panel())
    .filter(el => !el.querySelector('li') && el.textContent.trim().length > 20);
}

function buildThemes() {
  const box = $('#themes');
  const units = themeUnits();
  const found = THEMES.map(t => ({ ...t, n: units.filter(u => t.re.test(u.textContent)).length })).filter(t => t.n);
  if (!found.length) { box.remove(); return; }
  box.innerHTML = `<span class="themes-label">Explorer par thème</span>` +
    found.map(t => `<button class="chip" data-theme="${t.id}" aria-pressed="false">${t.label}<span class="n">${t.n}</span></button>`).join('');
  $$('.chip', box).forEach(b => b.onclick = () => applyTheme(b.dataset.theme === document.body.dataset.theme ? null : b.dataset.theme));
}

function applyTheme(id) {
  const root = panel();
  const t = THEMES.find(x => x.id === id);
  $$('.chip', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === id)));
  $$('.hit', root).forEach(n => n.classList.remove('hit'));
  if (!t) {
    delete document.body.dataset.theme;
    root.querySelector('.voie')?.classList.remove('filtering');
    return;
  }
  document.body.dataset.theme = id;
  root.querySelector('.voie').classList.add('filtering');
  themeUnits().forEach(u => { if (t.re.test(u.textContent)) u.classList.add('hit'); });
  $$('details.sec', root).forEach(d => { d.open = !!d.querySelector('.hit'); d.classList.toggle('has-hit', !!d.querySelector('.hit')); });
  const first = $('.hit', root);
  first?.closest('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- « Le saviez-vous ? » */

function buildDidYouKnow(art) {
  const pool = [];
  $$('.voie details.sec:not(.sec-situation) .prose', panel()).forEach(p => {
    sentences(p.textContent).forEach(s => {
      if (s.length > 70 && s.length < 260 && /\b(1[0-9]{3}|20[0-2][0-9])\b|habit|n[ée]e? |construit|film|roman|tableau|architecte/i.test(s)) pool.push(s);
    });
  });
  if (!pool.length) return;
  let i = Math.floor(Math.random() * pool.length);
  const box = $('#dyk');
  const draw = () => {
    box.innerHTML = `
      <aside class="dyk">
        <div class="dyk-head">${icon('lamp')}<span>Le saviez-vous ?</span>
        ${pool.length > 1 ? `<button class="dyk-next" aria-label="Une autre anecdote">Une autre</button>` : ''}</div>
        <p>${escapeHtml(pool[i])}</p>
      </aside>`;
    const next = $('.dyk-next', box);
    if (next) next.onclick = () => { i = (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length; draw(); };
  };
  draw();
}

/* =================================================================== Aperçu des liens */

async function openPreview(title, href) {
  const sheet = $('#sheet'), content = $('#sheet-content');
  content.innerHTML = `<div class="sheet-body"><h3>${escapeHtml(title)}</h3><div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>`;
  $('#sheet-backdrop').hidden = false; sheet.hidden = false;
  requestAnimationFrame(() => { sheet.classList.add('open'); $('#sheet-backdrop').classList.add('open'); });
  try {
    const s = await fetchSummary(title);
    const voie = isVoieTitle(s.title) || /voie|rue|avenue|place/i.test(s.description || '') && isVoieTitle(s.title);
    content.innerHTML = `
      <div class="sheet-body">
        ${s.thumbnail ? `<img class="sheet-img" src="${escapeHtml(s.thumbnail.source)}" alt="">` : ''}
        <h3>${escapeHtml(s.title)}</h3>
        ${s.description ? `<p class="sheet-desc">${escapeHtml(s.description)}</p>` : ''}
        <p class="sheet-extract">${escapeHtml(s.extract || '')}</p>
        <div class="link-row">
          ${voie ? `<button class="btn primary" id="sheet-explore">Explorer cette voie</button>` : ''}
          <a class="btn ${voie ? 'ghost' : 'primary'}" href="${escapeHtml(s.content_urls?.mobile?.page || href)}" target="_blank" rel="noopener">${icon('wiki')} Lire sur Wikipédia</a>
        </div>
      </div>`;
    if (voie) $('#sheet-explore').onclick = () => { closeSheet(); stopFollowing(); loadStreet({ title: s.title, source: 'search' }); };
  } catch {
    content.innerHTML = `<div class="sheet-body"><h3>${escapeHtml(title)}</h3><p>Aperçu indisponible.</p><a class="btn primary" href="${escapeHtml(href)}" target="_blank" rel="noopener">Ouvrir sur Wikipédia</a></div>`;
  }
}

function closeSheet() {
  const sheet = $('#sheet');
  sheet.classList.remove('open'); $('#sheet-backdrop').classList.remove('open');
  setTimeout(() => { sheet.hidden = true; $('#sheet-backdrop').hidden = true; }, 250);
}

/* =================================================================== Recherche */

let searchList = [];

async function openSearch() {
  const ov = $('#search-overlay');
  ov.hidden = false;
  const input = $('#search-input');
  input.value = '';
  setTimeout(() => input.focus(), 50);
  renderSearch('');
  $('#search-meta').textContent = 'Chargement de la liste des voies…';
  searchList = await loadVoieList();
  $('#search-meta').textContent = searchList.length
    ? `${searchList.length} voies du 16e arrondissement`
    : 'Liste indisponible : la recherche interroge directement Wikipédia.';
  renderSearch(input.value);
}

const renderSearch = debounce(async q => {
  const box = $('#search-results');
  const k = norm(q);
  if (!k) {
    box.innerHTML = `
      <button class="result random" id="s-random">${icon('dice')}<span><strong>Une voie au hasard</strong><small>Laissez le hasard guider votre curiosité</small></span></button>
      <p class="results-head">Coups de cœur</p>
      ${COUPS_DE_COEUR.map(c => resultItem(c.title, c.teaser)).join('')}`;
    $('#s-random').onclick = () => { closeOverlays(); randomVoie(); };
  } else {
    let hits = searchList.filter(t => norm(stripParis(t)).includes(k));
    hits.sort((a, b) => norm(stripParis(a)).indexOf(k) - norm(stripParis(b)).indexOf(k));
    if (!searchList.length) hits = await searchVoies(q);
    box.innerHTML = hits.length
      ? hits.slice(0, 60).map(t => resultItem(t)).join('')
      : `<p class="empty">Aucune voie ne correspond à « ${escapeHtml(q)} ».</p>`;
  }
  $$('.result[data-title]', box).forEach(b => b.onclick = () => {
    closeOverlays(); stopFollowing(); loadStreet({ title: b.dataset.title, source: 'search' });
  });
}, 120);

function resultItem(title, teaser) {
  const seen = state.journal[title];
  return `<button class="result" data-title="${escapeHtml(title)}">
    <span><strong>${escapeHtml(stripParis(title))}</strong>${teaser ? `<small>${escapeHtml(teaser)}</small>` : ''}</span>
    ${seen ? `<span class="seen" title="Déjà découverte">✓</span>` : ''}
  </button>`;
}

async function randomVoie() {
  const list = await loadVoieList();
  const unseen = list.filter(t => !state.journal[t]);
  const pool = unseen.length ? unseen : list;
  if (!pool.length) { toast('Liste des voies indisponible pour le moment.'); return; }
  stopFollowing();
  loadStreet({ title: pool[Math.floor(Math.random() * pool.length)], source: 'search' });
}

/* =================================================================== Carnet */

function record(art, source) {
  const j = state.journal;
  const e = j[art.title] || { title: art.title, name: art.name, first: Date.now(), walked: false, views: 0 };
  e.last = Date.now();
  e.views++;
  if (source === 'gps') e.walked = true;
  const before = Object.keys(j).length;
  j[art.title] = e;
  store.set('journal', j);
  updateCount();
  const after = Object.keys(j).length;
  const badge = BADGES.find(b => b.n === after && after > before);
  if (badge) setTimeout(() => toast(`Nouveau titre : ${badge.label} ✦ ${badge.desc}`, { duration: 6000 }), 900);
}

function updateCount() {
  const n = Object.keys(state.journal).length;
  const b = $('#carnet-count');
  b.hidden = !n; b.textContent = n;
}

async function openCarnet() {
  $('#carnet-overlay').hidden = false;
  const list = await loadVoieList();
  const entries = Object.values(state.journal).sort((a, b) => b.last - a.last);
  const n = entries.length, total = list.length || 0;
  const in16count = total ? entries.filter(e => list.includes(e.title)).length : n;
  const walked = entries.filter(e => e.walked).length;
  const pct = total ? Math.min(100, (in16count / total) * 100) : 0;
  const next = BADGES.find(b => b.n > n);
  $('#carnet-content').innerHTML = `
    <div class="carnet-stats">
      <div class="ring" style="--p:${pct.toFixed(1)}">
        <div><strong>${in16count}</strong><small>${total ? `sur ${total}` : 'voies'}</small></div>
      </div>
      <div class="carnet-figures">
        <p><strong>${n}</strong> voie${n > 1 ? 's' : ''} découverte${n > 1 ? 's' : ''}</p>
        <p><strong>${walked}</strong> arpentée${walked > 1 ? 's' : ''} à pied</p>
        ${next ? `<p class="next">Plus que ${next.n - n} pour devenir <em>${next.label}</em></p>` : '<p class="next">Vous connaissez le 16<sup>e</sup> comme personne.</p>'}
      </div>
    </div>
    <div class="badges">
      ${BADGES.map(b => `<span class="badge-item ${n >= b.n ? 'got' : ''}" title="${escapeHtml(b.desc)}">${b.label}<small>${b.n}</small></span>`).join('')}
    </div>
    ${n ? `
      <p class="results-head">Historique</p>
      <div class="carnet-list">
        ${entries.map(e => `
          <button class="result" data-title="${escapeHtml(e.title)}">
            <span><strong>${escapeHtml(e.name)}</strong><small>${e.walked ? 'Arpentée' : 'Lue'} · ${formatDate(e.last)}</small></span>
            ${e.walked ? icon('steps', 'walked') : icon('book', 'walked')}
          </button>`).join('')}
      </div>
      <button class="btn ghost wide danger" id="carnet-reset">Effacer mon carnet</button>`
    : `<p class="empty">Votre carnet est vide. Partez en promenade ou touchez une rue sur la carte : chaque voie découverte s’inscrira ici.</p>`}`;
  $$('#carnet-content .result').forEach(b => b.onclick = () => { closeOverlays(); stopFollowing(); loadStreet({ title: b.dataset.title, source: 'search' }); });
  const reset = $('#carnet-reset');
  if (reset) reset.onclick = () => {
    if (!confirm('Effacer toutes les voies de votre carnet ?')) return;
    state.journal = {}; store.set('journal', {}); updateCount(); openCarnet();
  };
}

function closeOverlays() {
  $$('.overlay').forEach(o => { o.hidden = true; });
}

/* =================================================================== Guide vocal */

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; u.rate = 1;
  const v = speechSynthesis.getVoices().find(v => v.lang?.startsWith('fr'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

function speakArticle(art) {
  const origin = art.sections.find(s => s.kind === 'origine');
  const tmp = document.createElement('div');
  tmp.innerHTML = origin?.html || art.intro;
  const txt = sentences(tmp.textContent).slice(0, 2).join(' ');
  speak(`Vous entrez ${withArticle(art.name)}. ${txt}`);
}

function setVoice(on) {
  state.voice = on;
  store.set('voice', on);
  const b = $('#btn-voice');
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? 'Guide vocal activé' : 'Guide vocal';
}

/* =================================================================== Toast */

let toastTimer;
function toast(msg, { action, onAction, duration = 4500 } = {}) {
  const t = $('#toast');
  t.innerHTML = `<span>${escapeHtml(msg)}</span>${action ? `<button>${escapeHtml(action)}</button>` : ''}`;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('show'));
  if (action) $('button', t).onclick = () => { hideToast(); onAction(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, duration);
}
function hideToast() {
  const t = $('#toast');
  t.classList.remove('show');
  setTimeout(() => { t.hidden = true; }, 250);
}

/* =================================================================== Démarrage */

function bind() {
  $('#btn-locate').onclick = () => {
    if (state.following && state.lastPos) { centerOnMe(); state.userPanned = 0; return; }
    startTracking();
  };
  $('#btn-search').onclick = openSearch;
  $('#btn-carnet').onclick = openCarnet;
  $('#btn-voice').onclick = () => {
    setVoice(!state.voice);
    toast(state.voice ? 'Guide vocal activé : je vous raconterai chaque nouvelle rue.' : 'Guide vocal désactivé.');
    if (state.voice) speak('Guide vocal activé.');
    else speechSynthesis?.cancel();
  };
  $('#search-input').addEventListener('input', e => renderSearch(e.target.value));
  $('#search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#search-results .result[data-title]')?.click();
  });
  $$('.overlay').forEach(o => o.addEventListener('click', e => {
    if (e.target === o || e.target.closest('[data-close]')) o.hidden = true;
  }));
  $('#sheet-backdrop').onclick = closeSheet;
  $('#sheet [data-close]').onclick = closeSheet;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeOverlays(); if (!$('#sheet').hidden) closeSheet(); }
  });

  // Les liens Wikipédia internes ouvrent un aperçu au lieu de quitter l'application.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-wiki]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openPreview(a.dataset.wiki, a.href);
  });

  // Panneau extensible sur mobile.
  $('#grabber').onclick = () => {
    const ex = document.body.classList.toggle('panel-expanded');
    $('#grabber').setAttribute('aria-label', ex ? 'Réduire le panneau' : 'Agrandir le panneau');
    setTimeout(() => state.map.invalidateSize(), 320);
  };
  let lastY = 0;
  $('#panel-scroll').addEventListener('scroll', e => {
    const y = e.target.scrollTop;
    if (matchMedia('(max-width: 820px)').matches && y > 120 && y > lastY && !document.body.classList.contains('panel-expanded')) {
      document.body.classList.add('panel-expanded');
      setTimeout(() => state.map.invalidateSize(), 320);
    }
    lastY = y;
  }, { passive: true });
  $('.map-wrap').addEventListener('click', () => {
    if (document.body.classList.contains('panel-expanded') && matchMedia('(max-width: 820px)').matches) {
      document.body.classList.remove('panel-expanded');
      setTimeout(() => state.map.invalidateSize(), 320);
    }
  }, true);
}

function init() {
  initMap();
  bind();
  setVoice(state.voice);
  updateCount();
  renderWelcome();
  loadVoieList(); // préchargement

  const params = new URLSearchParams(location.search);
  if (params.get('voie')) loadStreet({ title: params.get('voie'), source: 'search' });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // Si la permission est déjà accordée, on reprend directement la promenade.
  navigator.permissions?.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted' && !params.get('voie')) startTracking(); }).catch(() => {});
}

init();
