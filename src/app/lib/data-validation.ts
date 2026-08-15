export type CountryDataLike = {
  code: string;
  mapKey: string;
  numericCode: string;
  countryJa: string;
  countryEn: string;
  capitalJa: string;
  capitalEn: string;
  region: string;
  lat: number;
  lng: number;
  countryAnswers: string[];
  capitalAnswers: string[];
};

const expectedRegions = new Set([
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
]);

export const validateCountryData = (
  countries: readonly CountryDataLike[],
  expectedCount = 196
) => {
  const errors: string[] = [];
  const codes = new Set<string>();
  const mapKeys = new Set<string>();
  const numericCodes = new Set<string>();

  if (countries.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} countries, got ${countries.length}`);
  }

  countries.forEach((country, index) => {
    const label = `countries[${index}]`;
    if (!country.code) errors.push(`${label}.code is empty`);
    if (codes.has(country.code)) errors.push(`Duplicate ISO code: ${country.code}`);
    codes.add(country.code);

    if (!country.mapKey) errors.push(`${label}.mapKey is empty`);
    if (mapKeys.has(country.mapKey)) errors.push(`Duplicate mapKey: ${country.mapKey}`);
    mapKeys.add(country.mapKey);

    if (!country.numericCode) errors.push(`${label}.numericCode is empty`);
    if (numericCodes.has(country.numericCode)) {
      errors.push(`Duplicate numericCode: ${country.numericCode}`);
    }
    numericCodes.add(country.numericCode);

    if (!country.countryJa || !country.countryEn) {
      errors.push(`${country.code}: country name is empty`);
    }
    if (!country.capitalJa || !country.capitalEn) {
      errors.push(`${country.code}: capital is empty`);
    }
    if (!expectedRegions.has(country.region)) {
      errors.push(`${country.code}: invalid region ${country.region}`);
    }
    if (!Number.isFinite(country.lat) || !Number.isFinite(country.lng)) {
      errors.push(`${country.code}: invalid coordinates`);
    }
    if (!country.countryAnswers?.length) {
      errors.push(`${country.code}: countryAnswers is empty`);
    }
    if (!country.capitalAnswers?.length) {
      errors.push(`${country.code}: capitalAnswers is empty`);
    }
  });

  return errors;
};

export const assertCountryData = (
  countries: readonly CountryDataLike[],
  expectedCount = 196
) => {
  const errors = validateCountryData(countries, expectedCount);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
};
