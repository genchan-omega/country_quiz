import { describe, expect, it } from "vitest";
import countriesData from "@/data/countries.json";
import { validateCountryData } from "./data-validation";

describe("country data validation", () => {
  it("accepts the generated 196-country dataset", () => {
    expect(validateCountryData(countriesData)).toEqual([]);
  });

  it("reports duplicate identifiers and missing capitals", () => {
    const invalid = [
      { ...countriesData[0], code: "DUP", capitalJa: "" },
      { ...countriesData[1], code: "DUP", mapKey: countriesData[0].mapKey },
    ];
    const errors = validateCountryData(invalid, 2);
    expect(errors).toEqual(
      expect.arrayContaining([
        "Duplicate ISO code: DUP",
        `Duplicate mapKey: ${countriesData[0].mapKey}`,
        "DUP: capital is empty",
      ])
    );
  });
});
