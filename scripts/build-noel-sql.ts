/**
 * Convertit les recettes de Noël (scripts/data/noel.md, transcrites d'un livre) en un script
 * SQL à lancer une fois dans le SQL Editor de Supabase. Une recette déjà présente (même nom)
 * n'est pas recréée. Les recettes vont au foyer dont on donne le code d'invitation (page Foyer).
 *
 *   npx tsx@4.23.15 --tsconfig tsconfig.json scripts/build-noel-sql.ts 08083A
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseTextRecipe } from "@/lib/import/parse-text-recipe";

const code = process.argv[2]?.trim().toUpperCase();
if (!code || !/^[A-Z0-9]{6}$/.test(code)) throw new Error("Donnez le code d'invitation du foyer (6 caractères), visible sur la page Foyer.");

const source = readFileSync("scripts/data/noel.md", "utf8");
const chunks = source.split(/\n(?=# )/).filter((c) => c.trim());

const sql = (v: string | number | boolean | null | undefined) =>
  v == null ? "null" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v);
const arr = (v: string[]) => `array[${v.map(sql).join(", ")}]::text[]`;

const blocks: string[] = [];
const summary: string[] = [];
for (const chunk of chunks) {
  const draft = parseTextRecipe(chunk, { category: "noel", tags: ["bredele", "noël"] });
  // Des biscuits secs : ils tiennent des semaines en boîte, au-delà de ce que l'app compte en jours
  draft.fridge_days = 7;
  draft.freezable = false;

  summary.push(
    `${draft.name} · ${draft.yield_label ?? `${draft.servings} pers.`} · prépa ${draft.prep_minutes} / repos ${draft.rest_minutes} / cuisson ${draft.cook_minutes} min · ${draft.recipe_ingredients.length} ingrédients · ${draft.recipe_steps.length} étapes`,
    ...draft.recipe_ingredients.map((i) => `    ${i.group_label ? `[${i.group_label}] ` : ""}${i.quantity ?? ""} ${i.unit} | ${i.name} | ${i.aisle}`),
    ...draft.recipe_steps.map((s) => `    ${s.station} ${s.duration_minutes} min${s.hands_busy ? "" : " (passif)"} | ${s.text.slice(0, 70)}`),
  );

  const ingredients = draft.recipe_ingredients
    .map((i, p) => `(rid, ${p}, ${sql(i.group_label)}, ${sql(i.name)}, ${sql(i.quantity)}, ${sql(i.unit)}, ${sql(i.aisle)})`)
    .join(",\n      ");
  const steps = draft.recipe_steps.map((s, p) => `(rid, ${p}, ${sql(s.text)}, ${sql(s.station)}, ${s.duration_minutes}, ${s.hands_busy})`).join(",\n      ");

  blocks.push(`  if not exists (select 1 from public.recipes where household_id = hid and name = ${sql(draft.name)}) then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, ${sql(draft.name)}, 'noel', ${sql(draft.description)}, ${draft.servings}, ${sql(draft.yield_label)}, ${draft.prep_minutes}, ${draft.cook_minutes}, ${draft.rest_minutes}, ${draft.fridge_days}, ${draft.freezable}, ${arr(draft.tags)}, ${arr(draft.equipment)}, ${sql(draft.notes)})
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      ${ingredients};
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      ${steps};
  end if;`);
}

writeFileSync(
  "supabase/migrations/20261114090100_recettes_noel.sql",
  `-- Miam : les recettes de Noël (bredele), transcrites du livre de recettes.
-- À lancer APRÈS 20261114090000_noel.sql (qui crée la catégorie « Noël »).
-- Généré par scripts/build-noel-sql.ts depuis scripts/data/noel.md, pour le foyer au code ${code} ;
-- peut être relancé sans doublon.

do $$
declare
  hid uuid;
  rid uuid;
begin
  select id into hid from public.households where invite_code = '${code}';
  if hid is null then
    raise exception 'Aucun foyer avec le code ${code}';
  end if;

${blocks.join("\n\n")}
end $$;
`,
);
console.log(summary.join("\n"));
