import { describe, expect, it } from "vitest";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { generatePlan, pickReplacement } from "@/lib/planner/generate";
import { buildShoppingList } from "@/lib/planner/shopping";
import { groupedPrep, scheduleBatch } from "@/lib/planner/schedule";
import type { Criteria, Recipe } from "@/lib/types";

const recipes: Recipe[] = STARTER_RECIPES.map((d, i) => ({ ...d, id: `r${i}`, household_id: "h", author_id: i % 2 ? "b" : "a" }));
const byId = new Map(recipes.map((r) => [r.id, r]));

function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const criteria: Criteria = {
  people: [
    { userId: "a", count: 5, tags: ["épicé"] },
    { userId: "b", count: 5, tags: ["comfort food"] },
  ],
  maxMinutes: 180,
  minTags: { végé: 3 },
  excludeIngredients: [],
  avoidRecentWeeks: 3,
  shareIngredients: true,
};

describe("generatePlan", () => {
  it("remplit les 10 créneaux avec 10 recettes distinctes, 5 par personne", () => {
    const { meals } = generatePlan({ recipes, criteria, weeksSinceEaten: new Map(), rng: seeded() });
    expect(meals).toHaveLength(10);
    expect(new Set(meals.map((m) => m.recipe_id)).size).toBe(10);
    expect(meals.filter((m) => m.chosen_by === "a")).toHaveLength(5);
    expect(new Set(meals.map((m) => `${m.day}-${m.slot}`)).size).toBe(10);
  });

  it("respecte les exclusions et le minimum végé", () => {
    const { meals } = generatePlan({ recipes, criteria: { ...criteria, excludeIngredients: ["bœuf"] }, weeksSinceEaten: new Map(), rng: seeded(7) });
    const chosen = meals.map((m) => byId.get(m.recipe_id)!);
    expect(chosen.some((r) => r.recipe_ingredients.some((i) => /b(œ|oe)uf/i.test(i.name)))).toBe(false);
    expect(chosen.filter((r) => r.tags.includes("végé")).length).toBeGreaterThanOrEqual(3);
  });

  it("met au congélateur ce qui dépasse sa durée au frigo, et les plats fragiles en début de semaine", () => {
    const { meals } = generatePlan({ recipes, criteria, weeksSinceEaten: new Map(), rng: seeded(3) });
    for (const m of meals) {
      const r = byId.get(m.recipe_id)!;
      if (m.day + 1 > r.fridge_days && r.freezable) expect(m.storage).toBe("congelo");
      if (m.storage === "frigo" && !r.freezable) expect(m.day + 1).toBeLessThanOrEqual(r.fridge_days);
    }
  });

  it("évite les recettes mangées récemment quand c'est possible", () => {
    const recent = new Map(recipes.slice(0, 2).map((r) => [r.id, 1]));
    const small = { ...criteria, people: [{ userId: "a", count: 4, tags: [] }], minTags: {} };
    const { meals } = generatePlan({ recipes, criteria: small, weeksSinceEaten: recent, rng: seeded(9) });
    expect(meals.map((m) => m.recipe_id)).not.toContain("r0");
    expect(meals.map((m) => m.recipe_id)).not.toContain("r1");
  });

  it("propose un remplacement absent de la semaine", () => {
    const { meals } = generatePlan({ recipes, criteria, weeksSinceEaten: new Map(), rng: seeded() });
    const ids = meals.map((m) => m.recipe_id);
    const replacement = pickReplacement({ recipes, criteria, weeksSinceEaten: new Map(), rng: seeded() }, ids, ids[0], "a", 0);
    expect(replacement).toBeDefined();
    expect(ids).not.toContain(replacement!.id);
  });

  it("ne remplace un plat de fin de semaine que par un plat qui tient jusque-là", () => {
    const few = recipes.slice(0, 6).map((r) => r.id);
    for (let i = 0; i < 20; i++) {
      const r = pickReplacement({ recipes, criteria, weeksSinceEaten: new Map(), rng: seeded(i + 1) }, few, few[0], "a", 3)!;
      expect(r.freezable || r.fridge_days >= 4).toBe(true);
    }
  });

  it("évite deux plats du même type dans la semaine", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { meals } = generatePlan({ recipes, criteria, weeksSinceEaten: new Map(), rng: seeded(seed) });
      const chilis = meals.filter((m) => byId.get(m.recipe_id)!.name.startsWith("Chili"));
      expect(chilis.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("buildShoppingList", () => {
  it("additionne les ingrédients communs et met à l'échelle des portions", () => {
    const curry = recipes.find((r) => r.name === "Curry de pois chiches")!;
    const dahl = recipes.find((r) => r.name === "Dahl de lentilles corail")!;
    const meals = [curry, dahl].map((r, i) => ({ recipe_id: r.id, chosen_by: null, day: i, slot: "midi" as const, storage: "frigo" as const }));
    const list = buildShoppingList(meals, byId, 2);
    const coco = list.find((l) => l.name === "Lait de coco")!;
    expect(coco.quantity).toBe(400); // 2 × 400 ml pour 4, ramené à 2 portions
    expect(coco.sources).toHaveLength(2);
    const oignon = list.find((l) => l.name === "Oignon jaune")!;
    expect(oignon.quantity).toBe(1); // 0,5 + 0,5
  });
});

describe("scheduleBatch", () => {
  const week = recipes.slice(0, 10);

  it("planifie toutes les étapes, dans l'ordre de chaque recette", () => {
    const s = scheduleBatch(week, ["a", "b"]);
    expect(s.tasks).toHaveLength(week.reduce((n, r) => n + r.recipe_steps.length, 0));
    for (const r of week) {
      const steps = s.tasks.filter((t) => t.recipeId === r.id).sort((x, y) => Number(x.id.split(":")[1]) - Number(y.id.split(":")[1]));
      for (let i = 1; i < steps.length; i++) expect(steps[i].start).toBeGreaterThanOrEqual(steps[i - 1].end);
    }
  });

  it("ne dépasse jamais un four à la fois ni un cuisinier sur deux tâches actives", () => {
    const s = scheduleBatch(week, ["a", "b"]);
    const overlaps = (x: { start: number; end: number }, y: { start: number; end: number }) => x.start < y.end && y.start < x.end;
    const oven = s.tasks.filter((t) => t.station === "four");
    for (const x of oven) for (const y of oven) if (x !== y) expect(overlaps(x, y)).toBe(false);
    for (const cook of ["a", "b"]) {
      const mine = s.tasks.filter((t) => t.cook === cook);
      for (const x of mine) for (const y of mine) if (x !== y) expect(overlaps(x, y)).toBe(false);
    }
  });

  it("à deux, c'est plus rapide que seul", () => {
    expect(scheduleBatch(week, ["a", "b"]).totalMinutes).toBeLessThan(scheduleBatch(week, ["a"]).totalMinutes);
  });

  it("regroupe les légumes communs à plusieurs recettes", () => {
    const g = groupedPrep(week, 2);
    expect(g.find((x) => x.name === "Oignon jaune")?.recipes.length).toBeGreaterThan(2);
  });
});
