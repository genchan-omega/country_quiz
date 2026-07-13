import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import countries from "world-countries";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "src", "data");

const SIKEN_CAPITALS_URL = "https://www.siken.net/w_ranking?stat=capital";

const stripHtmlEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

const unique = (values) =>
  [...new Set(values.map((value) => value?.trim()).filter(Boolean))];

const normalizeNumericCode = (value) => String(value).padStart(3, "0");

const fetchSikenRows = async () => {
  const response = await fetch(SIKEN_CAPITALS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SIKEN_CAPITALS_URL}: ${response.status}`);
  }

  const html = await response.text();
  const rowPattern =
    /<tr>\s*<td>(\d+)．<\/td>\s*<td><a href="([^"]+)">([^<]+)<\/a><\/td>\s*<td>([^<]+)<\/td>\s*<td><img class="nflag" src="img\/nflag\/([A-Z0-9]+)\.png"/g;

  const byIso = new Map();
  const byNumeric = new Map();
  let match;

  while ((match = rowPattern.exec(html)) !== null) {
    const [, order, href, rawName, rawCapital, iso] = match;
    const numericMatch = href.match(/[?&]ccode=(\d+)/);
    const row = {
      order: Number(order),
      iso,
      numeric: numericMatch ? normalizeNumericCode(numericMatch[1]) : undefined,
      nameJa: stripHtmlEntities(rawName),
      capitalJa: stripHtmlEntities(rawCapital),
    };
    byIso.set(iso, row);
    if (row.numeric) byNumeric.set(row.numeric, row);
  }

  return { byIso, byNumeric };
};

const buildCountry = (country, siken) => {
  const capitalJaOverrides = {
    JPN: "東京",
    VAT: "バチカン市国",
  };
  const countryJa =
    siken?.nameJa ||
    country.translations?.jpn?.common ||
    country.name.common;
  const capitalJa =
    capitalJaOverrides[country.cca3] ||
    (siken?.capitalJa === "なし" ? undefined : siken?.capitalJa) ||
    country.capital?.[0] ||
    "";
  const capitalEn = country.capital?.[0] || capitalJa;

  const extraCountryAliases = {
    ARE: ["UAE", "アラブ首長国"],
    GBR: ["英国", "イギリス"],
    KOR: ["韓国", "大韓民国"],
    RUS: ["ロシア"],
    USA: ["アメリカ", "米国", "アメリカ合衆国"],
    VAT: ["バチカン", "バチカン市国"],
  };

  const extraCapitalAliases = {
    USA: ["ワシントン", "ワシントンDC", "Washington DC"],
    VAT: ["バチカン", "Vatican"],
  };

  return {
    code: country.cca3,
    mapKey: country.ccn3,
    numericCode: country.ccn3,
    countryJa,
    countryEn: country.name.common,
    capitalJa,
    capitalEn,
    region: country.region,
    subregion: country.subregion || "",
    lat: country.latlng?.[0] ?? 0,
    lng: country.latlng?.[1] ?? 0,
    countryAnswers: unique([
      countryJa,
      country.translations?.jpn?.common,
      country.translations?.jpn?.official,
      country.name.common,
      country.name.official,
      ...(country.altSpellings || []),
      ...(extraCountryAliases[country.cca3] || []),
    ]),
    capitalAnswers: unique([
      capitalJa,
      capitalEn,
      ...(extraCapitalAliases[country.cca3] || []),
    ]),
  };
};

const buildKosovo = (siken) => ({
  code: "XKX",
  mapKey: "Kosovo",
  numericCode: "383",
  countryJa: siken?.nameJa || "コソボ共和国",
  countryEn: "Kosovo",
  capitalJa: siken?.capitalJa || "プリシュティナ",
  capitalEn: "Pristina",
  region: "Europe",
  subregion: "Southeast Europe",
  lat: 42.6026,
  lng: 20.903,
  countryAnswers: unique([
    siken?.nameJa || "コソボ共和国",
    "コソボ",
    "Kosovo",
    "Republic of Kosovo",
  ]),
  capitalAnswers: unique([siken?.capitalJa || "プリシュティナ", "Pristina"]),
});

const main = async () => {
  const { byIso, byNumeric } = await fetchSikenRows();

  const included = countries
    .filter((country) => country.independent && country.cca3 !== "PRK")
    .concat(
      ["COK", "NIU"]
        .map((code) => countries.find((country) => country.cca3 === code))
        .filter(Boolean),
    )
    .map((country) =>
      buildCountry(country, byIso.get(country.cca3) || byNumeric.get(country.ccn3)),
    );

  included.push(buildKosovo(byIso.get("XKX")));

  const collator = new Intl.Collator("ja-JP");
  included.sort((a, b) => collator.compare(a.countryJa, b.countryJa));

  if (included.length !== 196) {
    throw new Error(`Expected 196 countries, got ${included.length}`);
  }

  const missingCapitalJa = included.filter((country) => !country.capitalJa);
  if (missingCapitalJa.length > 0) {
    throw new Error(
      `Missing Japanese capitals: ${missingCapitalJa
        .map((country) => country.code)
        .join(", ")}`,
    );
  }

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "countries.json"),
    `${JSON.stringify(included, null, 2)}\n`,
  );
  fs.copyFileSync(
    require.resolve("world-atlas/countries-50m.json"),
    path.join(dataDir, "world-map.json"),
  );

  console.log(`Generated ${included.length} countries`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
