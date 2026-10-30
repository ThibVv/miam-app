import type { Ingredient, RecipeDraft, Station, Step } from "@/lib/types";

type I = [quantity: number | null, unit: string, name: string, aisle: string];
type S = [text: string, station: Station, minutes: number, handsBusy: boolean];

const L = "Fruits & légumes";
const B = "Boucherie & poisson";
const C = "Crèmerie";
const E = "Épicerie";

function recipe(
  name: string,
  meta: { servings: number; prep: number; cook: number; fridge: number; freezable: boolean; tags: string[] },
  ingredients: I[],
  steps: S[],
): RecipeDraft {
  return {
    name,
    servings: meta.servings,
    prep_minutes: meta.prep,
    cook_minutes: meta.cook,
    fridge_days: meta.fridge,
    freezable: meta.freezable,
    tags: meta.tags,
    source_url: null,
    notes: null,
    recipe_ingredients: ingredients.map(([quantity, unit, n, aisle], position): Ingredient => ({ position, quantity, unit, name: n, aisle })),
    recipe_steps: steps.map(([text, station, duration_minutes, hands_busy], position): Step => ({ position, text, station, duration_minutes, hands_busy })),
  };
}

/** Recettes ajoutées à la création d'un foyer, pour pouvoir tester la génération tout de suite. */
export const STARTER_RECIPES: RecipeDraft[] = [
  recipe("Curry de pois chiches", { servings: 4, prep: 15, cook: 20, fridge: 4, freezable: true, tags: ["végé", "épicé"] },
    [[2, "boîte", "Pois chiches", E], [400, "ml", "Lait de coco", E], [1, "", "Oignon jaune", L], [2, "gousse", "Ail", L], [2, "c. à s.", "Pâte de curry", E], [0.5, "botte", "Coriandre", L]],
    [["Émincer l'oignon et l'ail.", "plan", 5, true], ["Faire revenir l'oignon et l'ail, ajouter la pâte de curry.", "plaque", 5, true], ["Ajouter pois chiches et lait de coco, laisser mijoter.", "plaque", 20, false], ["Parsemer de coriandre ciselée.", "plan", 3, true]]),
  recipe("Chili con carne", { servings: 4, prep: 15, cook: 50, fridge: 4, freezable: true, tags: ["épicé", "comfort food"] },
    [[500, "g", "Bœuf haché 5 %", B], [1, "boîte", "Haricots rouges", E], [400, "g", "Tomates concassées", E], [1, "", "Oignon jaune", L], [2, "gousse", "Ail", L], [1, "", "Poivron rouge", L], [1, "c. à c.", "Cumin", E]],
    [["Émincer oignon, ail et poivron.", "plan", 8, true], ["Faire revenir les légumes puis dorer le bœuf.", "plaque", 10, true], ["Ajouter tomates, haricots et épices, laisser mijoter à couvert.", "plaque", 40, false]]),
  recipe("Dahl de lentilles corail", { servings: 4, prep: 10, cook: 25, fridge: 4, freezable: true, tags: ["végé", "épicé"] },
    [[250, "g", "Lentilles corail", E], [400, "ml", "Lait de coco", E], [1, "", "Oignon jaune", L], [2, "gousse", "Ail", L], [1, "c. à s.", "Curry en poudre", E], [0.5, "botte", "Coriandre", L]],
    [["Émincer l'oignon et l'ail.", "plan", 5, true], ["Faire revenir avec le curry.", "plaque", 5, true], ["Ajouter lentilles, lait de coco et 500 ml d'eau, laisser cuire.", "plaque", 20, false]]),
  recipe("Poulet teriyaki & riz", { servings: 4, prep: 10, cook: 20, fridge: 3, freezable: false, tags: ["express", "riche en protéines"] },
    [[600, "g", "Filets de poulet", B], [250, "g", "Riz basmati", E], [6, "c. à s.", "Sauce soja", E], [2, "c. à s.", "Miel", E], [1, "", "Brocoli", L], [1, "c. à s.", "Graines de sésame", E]],
    [["Couper le poulet en dés et le brocoli en fleurettes.", "plan", 8, true], ["Cuire le riz.", "plaque", 15, false], ["Cuire le brocoli à la vapeur.", "plaque", 8, false], ["Dorer le poulet, laquer avec soja et miel.", "plaque", 12, true]]),
  recipe("Saumon, quinoa & brocoli", { servings: 2, prep: 10, cook: 20, fridge: 2, freezable: false, tags: ["poisson", "léger"] },
    [[2, "", "Pavés de saumon", B], [150, "g", "Quinoa", E], [1, "", "Brocoli", L], [1, "", "Citron", L]],
    [["Rincer le quinoa et couper le brocoli.", "plan", 5, true], ["Cuire le quinoa.", "plaque", 15, false], ["Cuire le saumon au four à 200 °C.", "four", 15, false], ["Cuire le brocoli à la vapeur.", "plaque", 8, false]]),
  recipe("Lasagnes aux légumes", { servings: 6, prep: 30, cook: 45, fridge: 4, freezable: true, tags: ["végé", "comfort food"] },
    [[12, "", "Feuilles de lasagne", E], [2, "", "Courgettes", L], [1, "", "Aubergine", L], [400, "g", "Tomates concassées", E], [250, "g", "Ricotta", C], [100, "g", "Mozzarella râpée", C], [1, "", "Oignon jaune", L]],
    [["Couper courgettes, aubergine et oignon.", "plan", 12, true], ["Faire revenir les légumes avec les tomates.", "plaque", 15, true], ["Monter les lasagnes en couches avec la ricotta.", "plan", 10, true], ["Cuire au four à 180 °C.", "four", 45, false]]),
  recipe("Bolognaise de lentilles", { servings: 4, prep: 10, cook: 30, fridge: 4, freezable: true, tags: ["végé", "comfort food"] },
    [[200, "g", "Lentilles vertes", E], [400, "g", "Spaghetti", E], [700, "g", "Coulis de tomate", E], [1, "", "Carotte", L], [1, "", "Oignon jaune", L], [2, "gousse", "Ail", L]],
    [["Hacher carotte, oignon et ail.", "plan", 8, true], ["Faire revenir, ajouter lentilles et coulis, mijoter.", "plaque", 30, false], ["Cuire les spaghetti.", "plaque", 10, false]]),
  recipe("Wok de nouilles au bœuf", { servings: 2, prep: 10, cook: 10, fridge: 2, freezable: false, tags: ["express", "riche en protéines"] },
    [[300, "g", "Bœuf émincé", B], [200, "g", "Nouilles de blé", E], [1, "", "Poivron rouge", L], [1, "", "Carotte", L], [3, "c. à s.", "Sauce soja", E], [1, "", "Gingembre (morceau)", L]],
    [["Émincer poivron, carotte et gingembre.", "plan", 8, true], ["Cuire les nouilles.", "plaque", 5, false], ["Saisir le bœuf et les légumes au wok, ajouter nouilles et soja.", "plaque", 8, true]]),
  recipe("Soupe butternut & feta", { servings: 4, prep: 15, cook: 40, fridge: 4, freezable: true, tags: ["végé", "léger", "de saison"] },
    [[1.5, "kg", "Courge butternut", L], [1, "", "Oignon jaune", L], [1, "l", "Bouillon de légumes", E], [100, "g", "Feta", C]],
    [["Éplucher et couper la courge en cubes.", "plan", 12, true], ["Rôtir la courge au four à 200 °C.", "four", 35, false], ["Mixer avec l'oignon revenu et le bouillon.", "plaque", 10, true]]),
  recipe("Gratin de pâtes au thon", { servings: 4, prep: 10, cook: 30, fridge: 3, freezable: true, tags: ["poisson", "comfort food"] },
    [[300, "g", "Pennes", E], [2, "boîte", "Thon au naturel", E], [20, "cl", "Crème fraîche", C], [100, "g", "Emmental râpé", C], [1, "", "Oignon jaune", L]],
    [["Cuire les pennes.", "plaque", 10, false], ["Mélanger pâtes, thon, crème et oignon revenu.", "plan", 8, true], ["Gratiner au four à 200 °C.", "four", 20, false]]),
  recipe("Poêlée poulet, patate douce & épinards", { servings: 4, prep: 15, cook: 25, fridge: 3, freezable: false, tags: ["léger", "riche en protéines", "de saison"] },
    [[500, "g", "Filets de poulet", B], [2, "", "Patates douces", L], [200, "g", "Épinards frais", L], [1, "c. à c.", "Paprika fumé", E], [2, "gousse", "Ail", L]],
    [["Couper patates douces et poulet en dés.", "plan", 10, true], ["Rôtir les patates douces au four.", "four", 25, false], ["Dorer le poulet à l'ail et au paprika, ajouter les épinards.", "plaque", 12, true]]),
  recipe("Chili sin carne", { servings: 4, prep: 15, cook: 35, fridge: 4, freezable: true, tags: ["végé", "épicé"] },
    [[2, "boîte", "Haricots rouges", E], [1, "boîte", "Maïs", E], [400, "g", "Tomates concassées", E], [1, "", "Patate douce", L], [1, "", "Oignon jaune", L], [1, "c. à c.", "Cumin", E]],
    [["Couper l'oignon et la patate douce.", "plan", 8, true], ["Faire revenir puis ajouter le reste, mijoter.", "plaque", 35, false]]),
];
