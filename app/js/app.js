import { $, $$, norm, stripParis, isVoieTitle, escapeHtml, distance, store, debounce, sentences, formatDate } from './util.js';
import { loadVoieList, resolveTitle, fetchArticle, fetchSummary, searchVoies, wikiUrl, KINDS, geoSearch, fetchPlaces } from './wiki.js';
import { reverseGeocode, fetchGeometry, walkingRoute, CENTER_16, in16 } from './geo.js';
import { PARCOURS } from './parcours.js';

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
  route: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2.5-6.5L14 17v4M7 12l2.5-4.5L13 8l2.5 3.5H18M11.5 14.5 13 8"/>',
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
  places: new Map(),        // titre -> lieu remarquable
  placeMarkers: new Map(),
  placesLayer: null,
  showPlaces: store.get('places', true),
  placesFetchedAt: null,    // position du dernier chargement autour de l'utilisateur
  alerted: new Set(),       // lieux déjà signalés pendant cette session
  heading: null,            // cap en degrés (0 = nord)
  compass: false,
  full: false,
  route: null,              // parcours en cours
};

/* =================================================================== Carte */

function initMap() {
  const map = L.map('map', { zoomControl: false, attributionControl: false, tap: true })
    .setView(CENTER_16, 14);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  state.map = map;
  setTiles();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', setTiles);

  state.streetLayer = L.layerGroup().addTo(map);
  state.pinLayer = L.layerGroup().addTo(map);
  state.routeLayer = L.layerGroup().addTo(map);
  state.placesLayer = L.layerGroup();

  map.on('click', e => { if (!state.compass) exploreAt(e.latlng.lat, e.latlng.lng); });
  map.on('dragstart', () => { state.userPanned = Date.now(); });
  map.on('moveend', debounce(loadPlacesInView, 500));
  map.on('zoomend', syncPlacesLayer);
  addEventListener('resize', debounce(layoutMap, 150));
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
    state.me = L.marker(ll, { icon: L.divIcon({ className: 'me', html: '<i class="cone"></i><span></span>', iconSize: [20, 20] }), interactive: false, zIndexOffset: 1000 }).addTo(state.map);
    applyHeading();
  } else {
    state.me.setLatLng(ll); state.meHalo.setLatLng(ll).setRadius(pos.acc);
  }

  // Cap GPS (quand on marche) si la boussole du téléphone n'est pas disponible.
  if (p.coords.heading != null && !isNaN(p.coords.heading) && (p.coords.speed || 0) > 0.6 && !state.compassLive) {
    state.heading = p.coords.heading; applyHeading();
  }

  if (!state.following) return;
  if (first) centerOnMe();
  else if (state.compass) state.map.setView(ll, state.map.getZoom(), { animate: false });
  else if (Date.now() - state.userPanned > 8000) state.map.panTo(ll, { animate: true });

  loadPlacesAround(pos);
  checkProximity(pos);

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
    updateStreetBar();
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

    <h2 class="kicker">Parcours thématiques</h2>
    <ul class="routes">${PARCOURS.map(routeCard).join('')}</ul>
    <p class="credits">Contenus issus de <a href="https://fr.wikipedia.org" target="_blank" rel="noopener">Wikipédia</a> (licence CC BY-SA) · Cartographie © OpenStreetMap.</p>
  </div>`;
  $('#w-locate').onclick = startTracking;
  $('#w-search').onclick = openSearch;
  $('#w-random').onclick = randomVoie;
  bindRouteCards(panel());
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

async function openPreview(title, href, place = null) {
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
        ${place?.lat != null && state.lastPos ? `<p class="sheet-dist">${icon('walk')} à ${fmtKm(distance(state.lastPos, place))} de vous</p>` : ''}
        <p class="sheet-extract">${escapeHtml(s.extract || '')}</p>
        <div class="link-row">
          ${voie ? `<button class="btn primary" id="sheet-explore">Explorer cette voie</button>` : ''}
          <a class="btn ${voie ? 'ghost' : 'primary'}" href="${escapeHtml(s.content_urls?.mobile?.page || href)}" target="_blank" rel="noopener">${icon('wiki')} Lire sur Wikipédia</a>
          ${place?.lat != null ? `
          <button class="btn ghost" id="sheet-map">${icon('situation')} Voir sur la carte</button>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${place.lat},${place.lon}">${icon('walk')} Y aller à pied</a>` : ''}
        </div>
      </div>`;
    if (voie) $('#sheet-explore').onclick = () => { closeSheet(); stopFollowing(); loadStreet({ title: s.title, source: 'search' }); };
    const mapBtn = $('#sheet-map');
    if (mapBtn) mapBtn.onclick = () => {
      closeSheet();
      if (!state.compass) { stopFollowing(); state.map.flyTo([place.lat, place.lon], 18, { duration: .7 }); }
      if (document.body.classList.contains('panel-expanded')) $('#grabber').click();
    };
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

let toastTimer, toastBusyUntil = 0, toastQueue = [];
function toast(msg, opts = {}) {
  // Un message simple ne remplace pas une alerte (avec bouton) encore récente : il attend son tour.
  if (!opts.action && Date.now() < toastBusyUntil) { toastQueue.push([msg, opts]); return; }
  const { action, onAction, duration = 4500 } = opts;
  if (action) toastBusyUntil = Date.now() + Math.min(duration, 6000);
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
  toastBusyUntil = 0;
  setTimeout(() => {
    t.hidden = true;
    const next = toastQueue.shift();
    if (next) toast(...next);
  }, 250);
}

/* =================================================================== Lieux remarquables sur la carte */

const PLACES_MIN_ZOOM = 15;

function placeIcon(p) {
  return L.divIcon({
    className: 'poi',
    html: `<span class="poi-dot">${p.thumb ? `<img src="${escapeHtml(p.thumb)}" alt="" loading="lazy">` : icon('batiments')}</span>`,
    iconSize: [34, 34], iconAnchor: [17, 17],
  });
}

function addPlaces(list) {
  for (const p of list) {
    if (state.places.has(p.title)) continue;
    state.places.set(p.title, p);
    const m = L.marker([p.lat, p.lon], { icon: placeIcon(p), title: p.title, riseOnHover: true, keyboard: true })
      .on('click', () => openPreview(p.title, wikiUrl(p.title), p));
    state.placeMarkers.set(p.title, m);
    m.addTo(state.placesLayer);
  }
}

function syncPlacesLayer() {
  const show = state.showPlaces && state.map.getZoom() >= PLACES_MIN_ZOOM;
  if (show && !state.map.hasLayer(state.placesLayer)) state.placesLayer.addTo(state.map);
  if (!show && state.map.hasLayer(state.placesLayer)) state.map.removeLayer(state.placesLayer);
}

async function loadPlacesInView() {
  syncPlacesLayer();
  if (!state.showPlaces || state.map.getZoom() < PLACES_MIN_ZOOM) return;
  const c = state.map.getCenter();
  const b = state.map.getBounds();
  const radius = c.distanceTo(b.getNorthEast());
  try { addPlaces(await geoSearch(c.lat, c.lng, radius, 100)); } catch (e) { console.warn(e); }
}

/** Charge les lieux autour de l'utilisateur (pour les alertes), même si la carte regarde ailleurs. */
async function loadPlacesAround(pos) {
  if (state.placesFetchedAt && distance(state.placesFetchedAt, pos) < 250) return;
  state.placesFetchedAt = pos;
  try {
    addPlaces(await geoSearch(pos.lat, pos.lon, 600, 100));
    if (state.following && state.lastPos) checkProximity(state.lastPos);
  } catch (e) { state.placesFetchedAt = null; }
}

function setShowPlaces(on) {
  state.showPlaces = on;
  store.set('places', on);
  $('#btn-places').setAttribute('aria-pressed', String(on));
  if (on) loadPlacesInView(); else syncPlacesLayer();
}

/* =================================================================== Alertes de proximité */

function checkProximity(pos) {
  const acc = Math.min(pos.acc || 30, 60);
  // Étapes du parcours en cours
  if (state.route) {
    state.route.stops.forEach((s, i) => {
      if (s.lat == null || state.route.reached.has(i)) return;
      if (distance(pos, s) <= Math.max(45, acc)) {
        state.route.reached.add(i);
        updateRouteBar();
        refreshStopMarkers();
        alertNear(`Étape ${i + 1} · ${stripParis(s.title)}`, s.note, () => openStop(s), `Étape ${i + 1} : ${stripParis(s.title)}. ${s.note}`);
      }
    });
  }
  // Lieux remarquables
  let best = null, bestD = Infinity;
  for (const p of state.places.values()) {
    if (state.alerted.has(p.title)) continue;
    const d = distance(pos, p);
    if (d < bestD) { best = p; bestD = d; }
  }
  if (best && bestD <= Math.max(35, acc)) {
    state.alerted.add(best.title);
    alertNear(`Vous passez devant : ${best.title}`, best.description, () => openPreview(best.title, wikiUrl(best.title), best),
      `Vous passez devant ${best.title}${best.description ? ', ' + best.description : ''}.`);
  }
}

let lastAlert = 0;
function alertNear(title, sub, onOpen, speech) {
  if (Date.now() - lastAlert < 8000) return; // pas plus d'une alerte toutes les 8 s
  lastAlert = Date.now();
  navigator.vibrate?.([120, 80, 120]);
  toast(title + (sub ? ` — ${sub}` : ''), { action: 'Découvrir', onAction: onOpen, duration: 10000 });
  if (state.voice) speak(speech || title);
}

/* =================================================================== Parcours thématiques */

function routeCard(r) {
  return `<li><button class="route-card" data-route="${r.id}" style="--rc:${r.color}">
    <span class="route-theme">${escapeHtml(r.theme)} · ${r.stops.length} étapes</span>
    <span class="route-title">${escapeHtml(r.title)}</span>
    <span class="route-sub">${escapeHtml(r.subtitle)}</span>
    ${icon('chevron', 'chev')}
  </button></li>`;
}

function bindRouteCards(root) {
  $$('.route-card', root).forEach(b => b.onclick = () => showRoute(b.dataset.route));
}

function renderParcoursList() {
  $('#panel-scroll').scrollTop = 0;
  panel().innerHTML = `
    <div class="welcome">
      <p class="eyebrow">Parcours thématiques</p>
      <h1 class="display">Suivez le guide,<br><em>étape par étape.</em></h1>
      <p class="lead">Chaque parcours relie des lieux qui racontent une même histoire. Lancez-le : la carte trace l’itinéraire à pied, et votre téléphone vibre à l’approche de chaque étape.</p>
      <ul class="routes">${PARCOURS.map(routeCard).join('')}</ul>
      <button class="btn ghost wide" id="p-home">Retour à l’accueil</button>
    </div>`;
  bindRouteCards(panel());
  $('#p-home').onclick = renderWelcome;
  openPanelIfMobile();
}

const fmtKm = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
const fmtMin = s => { const m = Math.round(s / 60 / 5) * 5; return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };

/** Ordonne les étapes au plus court (voisin le plus proche), en partant de la première. */
function orderStops(stops) {
  const located = stops.filter(s => s.lat != null);
  const rest = stops.filter(s => s.lat == null);
  if (located.length < 3) return [...located, ...rest];
  const out = [located.shift()];
  while (located.length) {
    const last = out[out.length - 1];
    let k = 0;
    located.forEach((s, i) => { if (distance(last, s) < distance(last, located[k])) k = i; });
    out.push(located.splice(k, 1)[0]);
  }
  return [...out, ...rest];
}

async function prepareRoute(def) {
  const stops = orderStops(await fetchPlaces(def.stops));
  const pts = stops.filter(s => s.lat != null);
  let path = null;
  try { path = pts.length > 1 ? await walkingRoute(pts) : null; } catch (e) { console.warn(e); }
  if (!path) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += distance(pts[i - 1], pts[i]) * 1.3;
    path = { line: null, distance: d, duration: d / (4.5 / 3.6) };
  }
  return { def, stops, path };
}

const routeCache = new Map();
async function showRoute(id) {
  const def = PARCOURS.find(r => r.id === id);
  if (!def) return;
  stopFollowing();
  $('#panel-scroll').scrollTop = 0;
  panel().innerHTML = `
    <div class="route-head" style="--rc:${def.color}"><p class="eyebrow">${escapeHtml(def.theme)}</p><h1 class="display">${escapeHtml(def.title)}</h1><p class="lead">${escapeHtml(def.intro)}</p></div>
    <div class="skeleton"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>`;
  openPanelIfMobile();
  try {
    if (!routeCache.has(id)) routeCache.set(id, prepareRoute(def));
    const r = await routeCache.get(id);
    renderRoute(r);
    drawRoute(r, true);
  } catch (e) {
    routeCache.delete(id);
    renderMessage('Parcours indisponible', 'Impossible de charger les étapes. Vérifiez votre connexion et réessayez.', () => showRoute(id));
  }
}

function renderRoute(r) {
  const { def, stops, path } = r;
  const active = state.route?.def.id === def.id;
  panel().innerHTML = `
    <article class="route" style="--rc:${def.color}">
      <div class="route-head">
        <p class="eyebrow">${escapeHtml(def.theme)} · parcours</p>
        <h1 class="display">${escapeHtml(def.title)}</h1>
        <p class="lead">${escapeHtml(def.intro)}</p>
      </div>
      <div class="route-metrics">
        <span>${icon('walk')}<strong>${fmtKm(path.distance)}</strong></span>
        <span>${icon('clock')}<strong>${fmtMin(path.duration)}</strong><small>sans les arrêts</small></span>
        <span>${icon('situation')}<strong>${stops.length}</strong><small>étapes</small></span>
      </div>
      <div class="cta-row">
        ${active
          ? `<button class="btn primary" id="r-stop">Quitter le parcours</button>`
          : `<button class="btn primary" id="r-start">${icon('steps')} Démarrer le parcours</button>`}
        <a class="btn ghost" target="_blank" rel="noopener" href="${gmapsUrl(stops)}">${icon('map')} Ouvrir dans Google Maps</a>
      </div>
      ${path.line ? '' : '<p class="hint-line">Itinéraire détaillé indisponible : la carte relie les étapes à vol d’oiseau.</p>'}
      <ol class="stops">
        ${stops.map((s, i) => `
          <li class="stop ${state.route?.def.id === def.id && state.route.reached.has(i) ? 'done' : ''}">
            <button data-i="${i}">
              <span class="stop-n">${i + 1}</span>
              <span class="stop-body">
                <strong>${escapeHtml(stripParis(s.title))}</strong>
                <span>${escapeHtml(s.note)}</span>
              </span>
              ${s.thumb ? `<img src="${escapeHtml(s.thumb)}" alt="" loading="lazy">` : ''}
            </button>
          </li>`).join('')}
      </ol>
      <p class="credits">Photos et fiches : Wikipédia (CC BY-SA). Itinéraire : OpenStreetMap / OSRM. Certaines étapes sont des voies privées : on les admire depuis la grille.</p>
      <button class="btn ghost wide" id="r-all">Tous les parcours</button>
    </article>`;
  $$('.stop button', panel()).forEach(b => b.onclick = () => {
    const s = stops[+b.dataset.i];
    if (s.lat != null) state.map.flyTo([s.lat, s.lon], 17, { duration: .6 });
    openStop(s);
  });
  $('#r-start')?.addEventListener('click', () => startRoute(r));
  $('#r-stop')?.addEventListener('click', () => { endRoute(); renderRoute(r); });
  $('#r-all').onclick = renderParcoursList;
}

function gmapsUrl(stops) {
  const pts = stops.filter(s => s.lat != null).map(s => `${s.lat},${s.lon}`);
  const dest = pts.pop(), origin = pts.shift();
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${dest}${pts.length ? '&waypoints=' + encodeURIComponent(pts.join('|')) : ''}`;
}

function openStop(s) {
  if (isVoieTitle(s.title)) { stopFollowing(); loadStreet({ title: s.title, source: 'search' }); }
  else openPreview(s.title, wikiUrl(s.title), s);
}

function drawRoute(r, fit) {
  state.routeLayer.clearLayers();
  const color = r.def.color;
  const pts = r.stops.filter(s => s.lat != null).map(s => [s.lat, s.lon]);
  const line = r.path.line || pts;
  L.polyline(line, { color: '#fff', weight: 9, opacity: .9, interactive: false }).addTo(state.routeLayer);
  L.polyline(line, { color, weight: 5, opacity: .95, dashArray: r.path.line ? null : '2 10', lineCap: 'round', interactive: false }).addTo(state.routeLayer);
  state.stopMarkers = r.stops.map((s, i) => s.lat == null ? null : L.marker([s.lat, s.lon], {
    icon: stopIcon(i, color, false), zIndexOffset: 500, title: stripParis(s.title),
  }).on('click', () => openStop(s)).addTo(state.routeLayer));
  refreshStopMarkers();
  if (fit && pts.length) state.map.flyToBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16, duration: .8 });
}

const stopIcon = (i, color, done) => L.divIcon({
  className: 'stop-marker' + (done ? ' done' : ''),
  html: `<span class="upright" style="--rc:${color}">${done ? '✓' : i + 1}</span>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

function refreshStopMarkers() {
  if (!state.route || !state.stopMarkers) return;
  state.stopMarkers.forEach((m, i) => m?.setIcon(stopIcon(i, state.route.def.color, state.route.reached.has(i))));
}

function startRoute(r) {
  state.route = { ...r, reached: new Set() };
  drawRoute(r, false);
  updateRouteBar();
  renderRoute(r);
  startTracking();
  toast('Parcours lancé : votre téléphone vibrera à l’approche de chaque étape.');
  if (state.voice) speak(`Parcours ${r.def.title}. ${r.stops.length} étapes. Première étape : ${stripParis(r.stops[0].title)}.`);
}

function endRoute() {
  state.route = null;
  state.stopMarkers = null;
  state.routeLayer.clearLayers();
  updateRouteBar();
}

function updateRouteBar() {
  const bar = $('#route-bar');
  if (!state.route) { bar.hidden = true; return; }
  const { stops, reached, def } = state.route;
  const next = stops.findIndex((s, i) => !reached.has(i));
  bar.hidden = false;
  bar.style.setProperty('--rc', def.color);
  $('.route-bar-txt', bar).innerHTML = next < 0
    ? `<strong>Parcours terminé ✦</strong> ${escapeHtml(def.title)}`
    : `<strong>Étape ${next + 1}/${stops.length}</strong> ${escapeHtml(stripParis(stops[next].title))}`;
  if (next < 0 && reached.size === stops.length && !state.route.done) {
    state.route.done = true;
    setTimeout(() => toast(`Bravo, parcours « ${def.title} » terminé !`, { duration: 7000 }), 1500);
  }
}

/* =================================================================== Boussole et carte orientée */

function applyHeading() {
  const h = state.heading;
  const el = state.me?.getElement();
  if (el) {
    el.classList.toggle('has-heading', h != null);
    if (h != null) el.style.setProperty('--h', `${h}deg`);
  }
  const mapEl = $('#map');
  const bearing = state.compass && h != null ? h : 0;
  mapEl.style.setProperty('--bearing', `${bearing}deg`);
  mapEl.style.transform = state.compass ? `rotate(${-bearing}deg)` : '';
  $('#btn-compass .needle').style.transform = `rotate(${-bearing}deg)`;
}

/** Agrandit la carte à la diagonale de son cadre pour qu'aucun coin ne soit vide une fois tournée. */
function layoutMap() {
  const mapEl = $('#map'), wrap = $('.map-wrap');
  if (state.compass) {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const d = Math.ceil(Math.hypot(w, h));
    Object.assign(mapEl.style, { inset: 'auto', width: d + 'px', height: d + 'px', left: (w - d) / 2 + 'px', top: (h - d) / 2 + 'px' });
  } else {
    Object.assign(mapEl.style, { inset: '', width: '', height: '', left: '', top: '' });
  }
  state.map.invalidateSize({ pan: false });
  if (state.compass && state.lastPos) state.map.setView([state.lastPos.lat, state.lastPos.lon], state.map.getZoom(), { animate: false });
}

let smoothed = null;
function onOrientation(e) {
  let h = null;
  if (e.webkitCompassHeading != null) h = e.webkitCompassHeading;
  else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
  if (h == null || isNaN(h)) return;
  h = (h + (screen.orientation?.angle || 0) + 360) % 360;
  state.compassLive = true;
  if (smoothed == null) smoothed = h;
  else smoothed = (smoothed + ((((h - smoothed) % 360) + 540) % 360 - 180) * 0.2 + 360) % 360;
  state.heading = smoothed;
  if (!state.headingFrame) state.headingFrame = requestAnimationFrame(() => { state.headingFrame = null; applyHeading(); });
}

async function listenOrientation() {
  if (state.orientationOn) return true;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      if (await DeviceOrientationEvent.requestPermission() === 'denied') return false;
    }
  } catch { return false; }
  const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  addEventListener(evt, onOrientation, true);
  state.orientationOn = true;
  return true;
}

async function setCompass(on) {
  if (on) {
    const ok = await listenOrientation();
    if (!ok) { toast('La boussole n’a pas été autorisée. La carte s’orientera d’après votre direction de marche.'); }
    state.compass = true;
    state.map.dragging.disable();
    startTracking();
    setTimeout(() => { if (!state.compassLive && state.heading == null) toast('Boussole indisponible sur cet appareil : la carte s’orientera dès que vous marcherez.'); }, 2500);
  } else {
    state.compass = false;
    state.map.dragging.enable();
  }
  document.body.classList.toggle('compass-on', state.compass);
  $('#btn-compass').setAttribute('aria-pressed', String(state.compass));
  layoutMap();
  applyHeading();
}

/* =================================================================== Carte plein écran */

function setFull(on) {
  state.full = on;
  document.body.classList.toggle('map-full', on);
  $('#btn-full').setAttribute('aria-pressed', String(on));
  $('#btn-full').setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Carte en plein écran');
  updateStreetBar();
  setTimeout(layoutMap, 320);
  if (on && !state.following && !state.route) startTracking();
}

function updateStreetBar() {
  const bar = $('#street-bar');
  if (!state.full || !state.current) { bar.hidden = true; return; }
  bar.hidden = false;
  $('.sb-name', bar).textContent = state.current.name;
}

function openPanelIfMobile() {
  if (state.full) setFull(false);
}

/* =================================================================== Démarrage */

function bind() {
  $('#btn-locate').onclick = () => {
    if (state.following && state.lastPos) { centerOnMe(); state.userPanned = 0; return; }
    startTracking();
  };
  $('#btn-search').onclick = openSearch;
  $('#btn-carnet').onclick = openCarnet;
  $('#btn-parcours').onclick = renderParcoursList;
  $('#btn-places').onclick = () => {
    setShowPlaces(!state.showPlaces);
    if (state.showPlaces && state.map.getZoom() < PLACES_MIN_ZOOM) toast('Zoomez sur la carte pour voir les lieux remarquables.');
  };
  $('#btn-compass').onclick = () => setCompass(!state.compass);
  $('#btn-full').onclick = () => setFull(!state.full);
  $('#sb-read').onclick = () => setFull(false);
  $('#route-bar-close').onclick = () => { endRoute(); toast('Parcours quitté.'); };
  $('#route-bar .route-bar-txt').onclick = () => { if (state.route) { setFull(false); showRoute(state.route.def.id); } };
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
    setTimeout(layoutMap, 320);
  };
  let lastY = 0;
  $('#panel-scroll').addEventListener('scroll', e => {
    const y = e.target.scrollTop;
    if (matchMedia('(max-width: 820px)').matches && y > 120 && y > lastY && !document.body.classList.contains('panel-expanded')) {
      document.body.classList.add('panel-expanded');
      setTimeout(layoutMap, 320);
    }
    lastY = y;
  }, { passive: true });
  $('.map-wrap').addEventListener('click', () => {
    if (document.body.classList.contains('panel-expanded') && matchMedia('(max-width: 820px)').matches) {
      document.body.classList.remove('panel-expanded');
      setTimeout(layoutMap, 320);
    }
  }, true);
}

function init() {
  initMap();
  bind();
  setVoice(state.voice);
  setShowPlaces(state.showPlaces);
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
