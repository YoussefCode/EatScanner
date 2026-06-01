import { normalizeValue, parseIngredients, stemValue } from "../src/services/parser";

describe("parser", () => {
  it("normalizes accents and spacing", () => {
    expect(normalizeValue("Caseine  ")).toBe("caseine");
  });

  it("removes percentages and parentheses", () => {
    const parsed = parseIngredients("Suiker 20%, Melkpoeder (vol), Cacao; Emulgator: E322");
    const normalized = parsed.map((item) => item.normalized);

    expect(normalized).toContain("suiker");
    expect(normalized).toContain("melkpoeder");
    expect(normalized).toContain("cacao");
    expect(normalized).toContain("emulgator");
    expect(normalized).toContain("e322");
  });

  it("applies simple stemming", () => {
    expect(stemValue("noten")).toBe("not");
  });
});
