import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import countries from "world-countries";
import { assertGeneratedData } from "./data-validation.mjs";

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

const normalizeCountryName = (value) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・\.．,，、:：;；()（）「」『』\-ーｰ]/g, "");

const sourceNameAliases = {
  BRN: ["ブルネイ・ダルサラーム"],
  KNA: ["セントクリストファー・ネイビス"],
  VCT: ["セントビンセントおよびグレナディーン諸島"],
};

const capitalJaOverrides = {
  BDI: "ギテガ",
  JPN: "東京",
  VAT: "バチカン市国",
};

const sourceCapitalFallbacks = {
  MCO: "Monaco",
  SGP: "Singapore",
  VAT: "バチカン市国",
};

const assertSourceCountryMatch = (country, siken) => {
  const sourceName = siken?.nameJa?.trim();
  const expectedNames = unique([
    country.translations?.jpn?.common,
    country.translations?.jpn?.official,
    country.name.common,
    country.name.official,
    ...(country.altSpellings || []),
    ...(sourceNameAliases[country.cca3] || []),
  ]);

  if (
    !sourceName ||
    !expectedNames.some(
      (expectedName) =>
        normalizeCountryName(expectedName) === normalizeCountryName(sourceName)
    )
  ) {
    throw new Error(
      `Country name mismatch for ${country.cca3}: source=${sourceName || "(empty)"}`
    );
  }
};

const assertSourceCapital = (countryCode, siken) => {
  if (!siken?.capitalJa || siken.capitalJa === "なし") {
    if (!sourceCapitalFallbacks[countryCode] && !capitalJaOverrides[countryCode]) {
      throw new Error(`Missing capital for ${countryCode}`);
    }
  }
};

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

  if (byIso.size < 196) {
    throw new Error(`Expected at least 196 capital rows, got ${byIso.size}`);
  }

  return { byIso, byNumeric };
};

const buildCountry = (country, siken) => {
  const countryJa =
    siken?.nameJa ||
    country.translations?.jpn?.common ||
    country.name.common;
  const capitalJa =
    capitalJaOverrides[country.cca3] ||
    (siken?.capitalJa === "なし" ? undefined : siken?.capitalJa) ||
    sourceCapitalFallbacks[country.cca3] ||
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

  const sourceCountries = countries
    .filter((country) => country.independent && country.cca3 !== "PRK")
    .concat(
      ["COK", "NIU"]
        .map((code) => countries.find((country) => country.cca3 === code))
        .filter(Boolean),
    );

  const missingSourceRows = sourceCountries.filter(
    (country) => !byIso.get(country.cca3) && !byNumeric.get(country.ccn3)
  );
  if (missingSourceRows.length > 0) {
    throw new Error(
      `Missing capital source rows for: ${missingSourceRows
        .map((country) => country.cca3)
        .join(", ")}`
    );
  }

  sourceCountries.forEach((country) => {
    const source = byIso.get(country.cca3) || byNumeric.get(country.ccn3);
    assertSourceCountryMatch(country, source);
    assertSourceCapital(country.cca3, source);
  });

  const included = sourceCountries.map((country) =>
    buildCountry(
      country,
      byIso.get(country.cca3) || byNumeric.get(country.ccn3)
    )
  );

  const kosovoSource = byIso.get("XKX") || byNumeric.get("383");
  if (!kosovoSource) {
    throw new Error("Missing capital source row for Kosovo (XKX/383)");
  }
  if (normalizeCountryName(kosovoSource.nameJa) !== normalizeCountryName("コソボ共和国")) {
    throw new Error(`Country name mismatch for XKX: source=${kosovoSource.nameJa}`);
  }
  assertSourceCapital("XKX", kosovoSource);
  included.push(buildKosovo(kosovoSource));

  const collator = new Intl.Collator("ja-JP");
  included.sort((a, b) => collator.compare(a.countryJa, b.countryJa));
  assertGeneratedData(included);

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
