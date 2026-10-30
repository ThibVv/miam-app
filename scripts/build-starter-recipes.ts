/**
 * Convertit les recettes du Drive (scripts/data/drive-recipes.json) en recettes de départ
 * (src/data/starter-recipes.json), catégorisées et taguées.
 *
 *   npx tsx@4.23.15 --tsconfig tsconfig.json scripts/build-starter-recipes.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseTextRecipe } from "@/lib/import/parse-text-recipe";
import { ingredientKey } from "@/lib/units";
import type { Category, RecipeDraft } from "@/lib/types";

interface DriveRecipe {
  driveId: string;
  title: string;
  folder: "plaque" | "four" | "mijote" | "one-pot" | "petit-dej";
  content: string;
}

const METHOD_TAG: Record<DriveRecipe["folder"], string | null> = {
  plaque: "poêle & wok",
  four: "au four",
  mijote: "mijoté",
  "one-pot": "one pot",
  "petit-dej": null,
};

const MEAT = /(poulet|boeuf|bœuf|porc|veau|agneau|dinde|jambon|lardon|chorizo|saucisse|merguez|knack|viande|steak|bacon|paleron|haché)/i;
const FISH = /(saumon|thon|cabillaud|crevette|poisson|colin|cabillaud|lieu)/i;

function category(r: DriveRecipe): Category {
  if (r.folder !== "petit-dej") return "plat";
  return /(pancake|gaufre|pain au lait|porridge)/i.test(r.title) ? "petit-dej" : "gouter";
}

function tags(r: DriveRecipe, draft: RecipeDraft): string[] {
  const out = new Set<string>();
  const method = METHOD_TAG[r.folder];
  if (method) out.add(method);
  const ingredients = draft.recipe_ingredients.map((i) => i.name).join(" ");
  // Les tags de cuisine se lisent dans le titre et les ingrédients, pas dans le texte des étapes
  const dish = `${r.title} ${ingredients}`;
  const all = `${r.title} ${r.content}`;
  if (draft.category === "plat") {
    if (FISH.test(ingredients)) out.add("poisson");
    else if (!MEAT.test(ingredients)) out.add("végé");
    if (/poulet|dinde/i.test(ingredients)) out.add("volaille");
    if (/boeuf|bœuf|viande hachée|haché/i.test(ingredients)) out.add("bœuf");
    if (/(curry|chili|piment|tikka|harissa|épicé|sriracha|masala|cajun|tacos)/i.test(dish)) out.add("épicé");
    if (/(gratin|lasagne|parmentier|boursin|mascarpone|crémeu|raclette|tartiflette|bourguignon|blanquette|bœuf aux carottes)/i.test(r.title)) out.add("comfort food");
    if (/(nouilles|ramen|udon|thaï|thai|teriyaki|sésame|miso|sauce soja|lait de coco|curry|tikka|masala|dahl|wok)/i.test(dish)) out.add("asiatique");
    if (/(pâtes|pates|tagliatelle|spaghetti|orzo|penne|spaetzle|polenta|lasagne|pizza|ragù|bolognaise|italienne)/i.test(r.title)) out.add("pâtes & italien");
    if (/(léger|allégé|skyr)/i.test(all)) out.add("léger");
  }
  if (/prot[ée]in/i.test(all)) out.add("protéiné");
  const total = draft.prep_minutes + draft.cook_minutes;
  if (total > 0 && total <= 30) out.add("express");
  if (/meal prep/i.test(all)) out.add("meal prep");
  return [...out];
}

const drive: DriveRecipe[] = JSON.parse(readFileSync(new URL("./data/drive-recipes.json", import.meta.url), "utf8"));

// Doublons (même titre) : on garde la fiche la plus complète
const byTitle = new Map<string, DriveRecipe>();
for (const r of drive) {
  const key = ingredientKey(r.title);
  const prev = byTitle.get(key);
  if (!prev || r.content.length > prev.content.length) byTitle.set(key, r);
}

const recipes: (RecipeDraft & { drive_id: string })[] = [...byTitle.values()]
  .map((r) => {
    const draft = parseTextRecipe(r.content, { title: r.title, category: category(r) });
    return { ...draft, tags: tags(r, draft), drive_id: r.driveId };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

writeFileSync(new URL("../src/data/starter-recipes.json", import.meta.url), JSON.stringify(recipes, null, 1));

const issues = recipes.filter((r) => !r.recipe_ingredients.length || !r.recipe_steps.length).map((r) => r.name);
const byCategory = recipes.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + 1 }), {});
console.log(`${drive.length} fiches → ${recipes.length} recettes (doublons retirés)`, byCategory);
if (issues.length) console.log("Sans ingrédients ou sans étapes :", issues);
