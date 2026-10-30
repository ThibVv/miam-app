// Extrait le texte des recettes du Drive (résultat brut de la recherche Drive) vers scripts/data/drive-recipes.json
import { readFileSync, writeFileSync } from "node:fs";

const FOLDERS = {
  "1TDb-Y9Iec-euoQc1utq6K8uA4Cr3sbox": "petit-dej",
  "1PJkl3azHI5w4bdPCDF6gE4gIA5aQIDKd": "mijote",
  "1AFqC0okMdP8kwnwazvpLs1X9ma2A_yof": "four",
  "1XaVhsb7opjvlrl7yPSHgporgzqJsiANJ": "one-pot",
  "1cMkp-gjfcA41UwB2d0EEwJGkcvnc8Hdt": "plaque",
};

const raw = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out = raw.files.map((f) => ({ driveId: f.id, title: f.title, folder: FOLDERS[f.parentId], content: f.contentSnippet }));
writeFileSync(new URL("./data/drive-recipes.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`${out.length} recettes extraites`);
