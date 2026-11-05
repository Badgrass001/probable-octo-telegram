// Géocodage inverse (Nominatim) et tracé des voies (Overpass), données OpenStreetMap.

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
// Emprise du 16e arrondissement (bois de Boulogne compris), avec une petite marge.
export const BBOX_16 = { s: 48.8155, w: 2.2240, n: 48.8810, e: 2.3020 };
export const CENTER_16 = [48.8605, 2.2690];

const STREET_FIELDS = ['road', 'pedestrian', 'square', 'footway', 'path', 'cycleway', 'living_street', 'place'];

/** Renvoie la voie la plus proche d'un point. */
export async function reverseGeocode(lat, lon) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1&accept-language=fr`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('Service de géocodage indisponible');
  const j = await r.json();
  const a = j.address || {};
  let name = STREET_FIELDS.map(f => a[f]).find(Boolean) || null;
  if (!name && j.category === 'highway') name = j.name;
  const district = a.city_district || a.suburb || a.borough || '';
  const postcode = a.postcode || '';
  const is16 = /^75(016|116)$/.test(postcode) || /\b16(e|ème)?\b/i.test(district);
  return { name, is16, postcode, district, city: a.city || a.town || '' };
}

const qlName = name => name
  .replace(/[\\"]/g, '')
  .replace(/[.()[\]{}*+?^$|]/g, '.')
  .replace(/[-\s]+/g, '[- ]')
  .replace(/['’]/g, "['’]");

/** Géométrie (polylignes) des tronçons OSM portant ce nom dans le 16e. */
export async function fetchGeometry(name) {
  const b = BBOX_16;
  const bbox = `${b.s},${b.w},${b.n},${b.e}`;
  const re = `^${qlName(name)}$`;
  const q = `[out:json][timeout:12];(way["highway"]["name"~"${re}",i](${bbox});way["place"]["name"~"${re}",i](${bbox}););out geom;`;
  const r = await fetch(OVERPASS, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(q),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!r.ok) throw new Error('Overpass indisponible');
  const j = await r.json();
  return (j.elements || [])
    .filter(e => e.geometry?.length > 1)
    .map(e => e.geometry.map(p => [p.lat, p.lon]));
}

export const in16 = (lat, lon) => lat > BBOX_16.s && lat < BBOX_16.n && lon > BBOX_16.w && lon < BBOX_16.e;

/** Itinéraire piéton passant par les points donnés (OSRM, profil piéton d'openstreetmap.de). */
export async function walkingRoute(points) {
  const coords = points.map(p => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const r = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`);
  if (!r.ok) throw new Error('Calcul d’itinéraire indisponible');
  const j = await r.json();
  const route = j.routes?.[0];
  if (!route) throw new Error('Aucun itinéraire');
  return {
    line: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distance: route.distance,
    // OSRM sous-estime souvent la durée à pied : on compte 4,5 km/h.
    duration: route.distance / (4.5 / 3.6),
  };
}
