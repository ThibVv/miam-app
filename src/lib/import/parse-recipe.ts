import type { Ingredient, RecipeDraft, Station, Step } from "@/lib/types";
import { normalizeUnit } from "@/lib/units";

const AISLE_KEYWORDS: [string, string[]][] = [
  ["Boucherie & poisson", ["poulet", "boeuf", "bœuf", "porc", "veau", "agneau", "dinde", "saumon", "thon", "cabillaud", "crevette", "lardon", "jambon", "chorizo", "saucisse", "viande", "steak", "poisson"]],
  ["Crèmerie", ["lait", "crème", "creme", "beurre", "fromage", "feta", "mozzarella", "parmesan", "emmental", "yaourt", "oeuf", "œuf", "ricotta", "gruyère", "comté", "chèvre"]],
  ["Fruits & légumes", ["oignon", "ail", "échalote", "carotte", "courgette", "tomate", "poivron", "aubergine", "brocoli", "épinard", "courge", "butternut", "potiron", "poireau", "chou", "salade", "pomme de terre", "patate", "champignon", "citron", "coriandre", "persil", "basilic", "gingembre", "menthe", "avocat", "concombre", "céleri", "haricot vert", "petits pois", "patate douce", "ciboulette", "thym", "pomme", "banane"]],
  ["Boulangerie", ["pain", "baguette", "tortilla", "wrap"]],
  ["Surgelés", ["surgelé", "surgelée", "surgelés"]],
  ["Épicerie", ["riz", "pâtes", "pates", "lentille", "pois chiche", "farine", "sucre", "huile", "vinaigre", "sauce", "épice", "curry", "cumin", "paprika", "bouillon", "conserve", "coulis", "lait de coco", "quinoa", "semoule", "nouilles", "boulgour", "haricot rouge", "concentré", "moutarde", "miel", "sel", "poivre", "maïs"]],
];

export function guessAisle(name: string): string {
  const n = name.toLowerCase();
  // « lait de coco » avant « lait », etc. : on prend le mot-clé le plus long qui correspond
  let best: { aisle: string; len: number } | null = null;
  for (const [aisle, words] of AISLE_KEYWORDS) {
    for (const w of words) if (n.includes(w) && (!best || w.length > best.len)) best = { aisle, len: w.length };
  }
  return best?.aisle ?? "Autre";
}

export function guessStation(text: string): Station {
  const t = text.toLowerCase();
  if (/(four|enfourne|gratin|rôti|roti|préchauff|prechauff)/.test(t)) return "four";
  if (/(mariner|réfrigér|refriger|reposer|au frais)/.test(t)) return "repos";
  if (/(poêle|poele|casserole|faitout|cocotte|wok|mijot|cuire|cuisson|bouill|revenir|dorer|frire|sauter|fondre|porter à)/.test(t)) return "plaque";
  return "plan";
}

export function guessHandsBusy(text: string, station: Station): boolean {
  const t = text.toLowerCase();
  if (station === "repos") return false;
  if (/(laisser|mijoter|cuire .*(min|heure)|enfourner|au four pendant|reposer)/.test(t)) return false;
  return true;
}

export function guessDuration(text: string): number | null {
  const t = text.toLowerCase();
  const h = t.match(/(\d+)\s*(h|heure)/);
  const m = t.match(/(\d+)\s*(min|mn)/);
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total || null;
}

/** "PT1H15M" → 75 */
export function parseIsoDuration(iso: unknown): number {
  if (typeof iso !== "string") return 0;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

const UNIT_PATTERN =
  "kg|g|gr|grammes?|mg|ml|cl|dl|l|litres?|c\\.?\\s?à\\.?\\s?s\\.?|c\\.?\\s?à\\.?\\s?c\\.?|cuill(?:è|e)res? à soupe|cuill(?:è|e)res? à café|cas|cac|cs|cc|boîtes?|boites?|bottes?|gousses?|tranches?|sachets?|pincées?|pots?|briques?";

/** "200 g de lentilles corail" → { quantity: 200, unit: "g", name: "lentilles corail" } */
export function parseIngredientLine(line: string, position = 0): Ingredient {
  let s = line.replace(/\s+/g, " ").trim();
  let quantity: number | null = null;

  const qty = s.match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔])?(?:\s*\/\s*(\d+))?/);
  if (qty && (qty[1] || qty[2])) {
    let q = qty[1] ? Number(qty[1].replace(",", ".")) : 0;
    if (qty[3] && qty[1]) q = q / Number(qty[3]);
    if (qty[2]) q += UNICODE_FRACTIONS[qty[2]];
    quantity = q;
    s = s.slice(qty[0].length).trim();
  }

  let unit = "";
  const unitMatch = s.match(new RegExp(`^(${UNIT_PATTERN})(?=\\s|$|\\.)\\.?\\s*`, "i"));
  if (unitMatch && quantity != null) {
    unit = normalizeUnit(unitMatch[1].replace(/\s+/g, " ")).unit || unitMatch[1];
    s = s.slice(unitMatch[0].length).trim();
  }
  s = s.replace(/^(de |d'|d’|du |des )/i, "").trim();
  const name = s.charAt(0).toUpperCase() + s.slice(1);

  return { position, name: name || line.trim(), quantity, unit, aisle: guessAisle(name) };
}

function stepFromText(text: string, position: number): Step {
  const station = guessStation(text);
  return {
    position,
    text,
    station,
    duration_minutes: guessDuration(text) ?? 5,
    hands_busy: guessHandsBusy(text, station),
  };
}

function textOf(node: unknown): string[] {
  if (!node) return [];
  if (typeof node === "string") return node.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (Array.isArray(node)) return node.flatMap(textOf);
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o["@type"] === "HowToSection") return textOf(o.itemListElement);
    if (typeof o.text === "string") return [o.text.trim()];
    if (typeof o.name === "string") return [o.name.trim()];
  }
  return [];
}

function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const d of data) {
      const r = findRecipeNode(d);
      if (r) return r;
    }
    return null;
  }
  const o = data as Record<string, unknown>;
  const type = o["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return o;
  if (o["@graph"]) return findRecipeNode(o["@graph"]);
  return null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Lit la recette décrite en JSON-LD schema.org dans une page web. */
export function parseRecipeFromHtml(html: string, url: string): RecipeDraft | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(json.trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(data);
    if (!node) continue;

    const yieldRaw = Array.isArray(node.recipeYield) ? node.recipeYield[0] : node.recipeYield;
    const servings = Number(String(yieldRaw ?? "").match(/\d+/)?.[0] ?? 4) || 4;
    const ingredients = (Array.isArray(node.recipeIngredient) ? node.recipeIngredient : [])
      .map((l: unknown) => decodeEntities(String(l)))
      .map((l: string, i: number) => parseIngredientLine(l, i));
    const steps = textOf(node.recipeInstructions).map((t, i) => stepFromText(decodeEntities(t), i));
    const keywords = typeof node.keywords === "string" ? node.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 5) : [];

    return {
      name: decodeEntities(String(node.name ?? "Recette importée")),
      servings,
      prep_minutes: parseIsoDuration(node.prepTime),
      cook_minutes: parseIsoDuration(node.cookTime),
      fridge_days: 3,
      freezable: false,
      tags: keywords,
      source_url: url,
      notes: null,
      recipe_ingredients: ingredients,
      recipe_steps: steps,
    };
  }
  return null;
}
