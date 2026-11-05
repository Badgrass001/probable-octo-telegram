# Flâneur · Paris 16e

*Chaque rue a une histoire.* Flâneur est une application web géolocalisée (installable sur téléphone) qui vous raconte les voies du 16e arrondissement de Paris au fil de votre promenade.

## Ce que fait l'application

- **Suit votre promenade** : grâce au GPS, elle reconnaît la rue, l'avenue, la villa, l'impasse… où vous vous trouvez et affiche sa fiche automatiquement (avec une confirmation sur deux lectures pour éviter les sauts aux carrefours). Si vous êtes en train de lire, elle vous propose la nouvelle rue sans interrompre votre lecture.
- **Fiche complète de chaque voie**, tirée de Wikipédia :
  - plaque de rue façon émail parisien, photo ;
  - **création, dénomination, anciens noms**, quartier, tenants et aboutissants, longueur, largeur ;
  - **origine du nom, historique, bâtiments remarquables et lieux de mémoire, personnalités, dans la culture** (cinéma, littérature, peinture…), situation et accès ;
  - **« Explorer par thème »** : un filtre qui ne montre que ce qui touche aux personnalités, à l'architecture, au cinéma, à la littérature, à la peinture, à la musique ou à la mémoire ;
  - **« Le saviez-vous ? »** : une anecdote tirée de l'article.
- **Liens hypertextes** : chaque lien ouvre un aperçu (résumé + photo) sans quitter l'application, avec « Lire sur Wikipédia » pour aller plus loin, ou « Explorer cette voie » quand le lien mène à une autre rue.
- **Explorer sans bouger** : touchez une rue sur la carte, cherchez parmi toutes les voies du 16e, ou laissez-vous tenter par « Une voie au hasard » et les coups de cœur.
- **Carnet de flânerie** : les voies découvertes (lues ou arpentées à pied), votre progression sur l'ensemble des voies du 16e et des titres à débloquer.
- **Guide vocal** (optionnel) : à l'entrée dans une nouvelle rue, l'application lit son nom et l'origine de celui-ci.
- Thème clair/sombre automatique, fonctionnement hors connexion pour ce qui a déjà été consulté.

## Sources de données

| Donnée | Source |
| --- | --- |
| Textes, fiches, images | Wikipédia en français (licence CC BY-SA), via l'API publique, en direct |
| Liste des voies du 16e | Article « Liste des voies du 16e arrondissement de Paris » |
| Rue où je me trouve | Nominatim (OpenStreetMap) |
| Tracé de la rue sur la carte | Overpass API (OpenStreetMap) |
| Fond de carte | CARTO / OpenStreetMap |

Aucune clé d'API n'est nécessaire et aucune donnée personnelle ne quitte le téléphone : le carnet est stocké localement dans le navigateur.

## Lancer l'application

La géolocalisation n'est autorisée par les navigateurs qu'en **HTTPS** (ou sur `localhost`).

**Sur votre ordinateur**, depuis la racine du dépôt :

```bash
python3 -m http.server 8000 --directory app
```

puis ouvrez http://localhost:8000.

**En ligne (pour l'utiliser dans la rue)** : le workflow `.github/workflows/pages.yml` publie le dossier `app/` sur GitHub Pages à chaque modification sur `main`. Il faut l'activer une fois dans *Settings → Pages → Build and deployment → Source : GitHub Actions*. L'adresse sera de la forme `https://<utilisateur>.github.io/<dépôt>/`.

**Installer sur le téléphone** : ouvrez l'adresse dans Safari (iPhone) ou Chrome (Android), puis « Partager → Sur l'écran d'accueil » / « Installer l'application ».

Astuce : `?voie=Rue Raynouard` dans l'adresse ouvre directement une fiche.

## Structure

```
app/
├── index.html            page unique
├── css/style.css         identité visuelle (plaques de rue parisiennes)
├── js/app.js             interface, carte, GPS, carnet, guide vocal
├── js/wiki.js            lecture et découpage des articles Wikipédia
├── js/geo.js             géocodage inverse et tracé des voies (OpenStreetMap)
├── js/util.js            utilitaires
├── sw.js                 service worker (hors connexion)
├── manifest.webmanifest  installation sur l'écran d'accueil
└── vendor/leaflet/       bibliothèque de carte Leaflet 1.9.4
```

## Pistes pour la suite

- Étendre à tout Paris (il suffit d'élargir l'emprise dans `geo.js` et de charger les listes des autres arrondissements).
- Parcours thématiques guidés (Art nouveau à Auteuil, Passy des écrivains…).
- Notification quand on passe devant un numéro remarquable de la rue.
