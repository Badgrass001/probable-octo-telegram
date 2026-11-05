// Parcours thématiques. Chaque étape est un article Wikipédia : ses coordonnées,
// sa photo et son résumé sont chargés en direct. `search` sert de secours si le titre change.

export const PARCOURS = [
  {
    id: 'art-nouveau',
    theme: 'Architecture',
    title: 'De l’Art nouveau au modernisme',
    subtitle: 'Guimard, Mallet-Stevens et Le Corbusier à Auteuil',
    color: '#2f5a43',
    intro: 'En quelques rues d’Auteuil, trente ans d’audace architecturale : les courbes végétales d’Hector Guimard, puis les volumes blancs des modernes.',
    stops: [
      { title: 'Castel Béranger', note: 'Le chef-d’œuvre de jeunesse d’Hector Guimard (1895-1898), qui fit entrer l’Art nouveau à Paris.' },
      { title: 'Hôtel Mezzara', note: 'Un hôtel particulier dessiné par Guimard au début des années 1910 pour un industriel du textile.' },
      { title: 'Hôtel Guimard', note: 'La maison que Guimard se construisit avec son épouse, la peintre Adeline Oppenheim.' },
      { title: 'Rue Mallet-Stevens', note: 'Une rue privée entièrement dessinée par Robert Mallet-Stevens, inaugurée en 1927.' },
      { title: 'Maisons La Roche et Jeanneret', search: 'Villa La Roche Le Corbusier', note: 'Le Corbusier et Pierre Jeanneret y conçoivent une maison-galerie pour le collectionneur Raoul La Roche.' },
    ],
  },
  {
    id: 'passy-ecrivains',
    theme: 'Littérature',
    title: 'Le Passy des écrivains',
    subtitle: 'Balzac, Clemenceau et la colline de Passy',
    color: '#7a3b2e',
    intro: 'Sur la colline qui domine la Seine, l’ancien village de Passy a abrité écrivains, hommes d’État et artistes, dont beaucoup reposent encore au pied du Trocadéro.',
    stops: [
      { title: 'Cimetière de Passy', note: 'Manet, Debussy, Giraudoux ou Fernandel reposent dans ce cimetière perché au-dessus du Trocadéro.' },
      { title: 'Musée Clemenceau', note: 'L’appartement où Georges Clemenceau vécut de 1896 à sa mort, en 1929.' },
      { title: 'Rue Raynouard', note: 'La rue de crête de la colline de Passy, entre le village et la Seine.' },
      { title: 'Maison de Balzac', note: 'Balzac s’y cache de ses créanciers de 1840 à 1847 et y corrige La Comédie humaine.' },
      { title: 'Rue Berton', note: 'Le chemin pavé par lequel, dit-on, Balzac pouvait s’éclipser discrètement.' },
    ],
  },
  {
    id: 'musees',
    theme: 'Peinture & arts',
    title: 'Les palais des musées',
    subtitle: 'De Chaillot à l’Alma',
    color: '#1c3366',
    intro: 'Entre le Trocadéro et l’Alma, des palais nés des Expositions universelles et des collections léguées par de grands mécènes.',
    stops: [
      { title: 'Palais de Chaillot', note: 'Construit pour l’Exposition de 1937 à la place de l’ancien palais du Trocadéro.' },
      { title: 'Musée national des arts asiatiques - Guimet', search: 'Musée Guimet', note: 'Les collections asiatiques réunies par l’industriel lyonnais Émile Guimet, installées ici en 1889.' },
      { title: 'Palais Galliera', note: 'Le musée de la Mode de la Ville de Paris, dans un palais voulu par la duchesse de Galliera.' },
      { title: 'Palais de Tokyo', note: 'Autre palais de l’Exposition de 1937, qui abrite le musée d’Art moderne de Paris.' },
    ],
  },
  {
    id: 'auteuil-village',
    theme: 'Histoire',
    title: 'Auteuil, l’ancien village',
    subtitle: 'Villas, hameaux et grand-rue',
    color: '#b0843a',
    intro: 'Rattaché à Paris en 1860, Auteuil a gardé de son passé villageois une église, une grand-rue et des enclaves de verdure.',
    stops: [
      { title: 'Villa Montmorency', search: 'Villa Montmorency Paris', note: 'Un lotissement privé et verdoyant, créé au XIXe siècle sur un ancien domaine.' },
      { title: 'Église Notre-Dame-d\'Auteuil', note: 'Église néo-romane élevée à la fin du XIXe siècle au cœur du vieux village.' },
      { title: 'Rue d\'Auteuil', note: 'La grand-rue de l’ancien village, bordée de maisons basses et de commerces.' },
      { title: 'Hameau Boileau', note: 'Un hameau privé de maisons et d’ateliers, caché derrière une grille.' },
      { title: 'Cimetière d\'Auteuil', note: 'Un petit cimetière de village où repose notamment le compositeur Charles Gounod.' },
    ],
  },
];
