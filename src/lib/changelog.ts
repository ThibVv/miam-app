/**
 * Nouveautés montrées une fois après une mise à jour (encadré « Quoi de neuf »).
 * À chaque mise à jour visible : ajouter une entrée EN TÊTE, avec un `id` plus grand
 * que les précédents (la date du jour), et des phrases pour quelqu'un qui ne code pas.
 */
export interface Release {
  /** AAAA-MM-JJ : sert aussi à savoir ce qui a déjà été vu */
  id: string;
  title: string;
  items: string[];
}

export const RELEASES: Release[] = [
  {
    id: "2026-11-14-2",
    title: "Un air de fête",
    items: [
      "Jusqu'à l'Épiphanie, l'app se met à l'heure de Noël : de la neige à l'ouverture, des boules qui se balancent en haut des pages et une guirlande lumineuse sur la barre du bas.",
      "Trop chargé ? Les décorations se coupent dans la page Foyer.",
    ],
  },
  {
    id: "2026-11-14",
    title: "Noël et des courses plus pratiques",
    items: [
      "Noël a son espace : les recettes de Noël (9 bredele du livre déjà ajoutés), un menu avec les invités et les fournées, une liste de courses à part avec des flocons, et la préparation de Noël.",
      "Courses : ce qui est coché descend dans « Dans le panier », replié en bas de la liste.",
      "Courses : « Ajouter un article » pour tout ce qui ne se mange pas (éponges, lessive…), rangé dans le bon rayon. Ces ajouts restent d'une semaine à l'autre tant qu'ils ne sont pas achetés.",
    ],
  },
  {
    id: "2026-11-09",
    title: "Plats, photos et nouveautés",
    items: [
      "Choisissez pour qui est un plat personne par personne : par exemple 2 personnes sur 3.",
      "Ajoutez votre propre photo à une recette, depuis la galerie ou l'appareil photo : bouton « Ajouter ma photo » sur la fiche.",
      "Et ce petit encadré, qui résume chaque mise à jour.",
    ],
  },
  {
    id: "2026-11-08",
    title: "Une semaine plus simple à préparer",
    items: [
      "Générer : choisissez le nombre de plats par personne. Les plats qui plaisent à tous sont cuisinés une seule fois, en plus grande quantité.",
      "« Selon une envie » : écrivez ce qui vous fait envie (« réconfortant », « courgettes »…), puis ajoutez les recettes proposées pour qui vous voulez.",
      "Ma semaine : la liste des plats à cuisiner, avec le multiplicateur de chaque recette.",
    ],
  },
];

export const LATEST_RELEASE = RELEASES[0].id;
export const SEEN_KEY = "nouveautes-vues";

/** Ce qu'il reste à montrer : tout ce qui est plus récent que la dernière nouveauté vue. */
export function unseenReleases(lastSeen: string | null): Release[] {
  // Jamais rien vu : quelqu'un qui utilisait déjà l'app avant l'encadré, on lui montre tout
  if (!lastSeen) return RELEASES;
  return RELEASES.filter((r) => r.id > lastSeen);
}
