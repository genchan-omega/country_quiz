import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertGeneratedData } from "./data-validation.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "src", "data", "countries.json");
const countries = JSON.parse(fs.readFileSync(dataPath, "utf8"));

assertGeneratedData(countries);
console.log(`Validated ${countries.length} countries`);
