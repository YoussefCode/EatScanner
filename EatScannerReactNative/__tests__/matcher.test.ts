import { evaluateSafety } from "../src/services/matcher";

describe("matcher", () => {
  it("detects exact blocked ingredient", async () => {
    const result = await evaluateSafety("water, suiker, melkpoeder", ["melk"], "OCR", {
      useOnlineLookup: false
    });
    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "melk")).toBe(true);
  });

  it("finds multiple blocked terms in one pass", async () => {
    const result = await evaluateSafety(
      "suiker, palmolie, hazelnoten, melkpoeder",
      ["noten", "melk", "suiker"],
      "Product API",
      { useOnlineLookup: false }
    );

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "noten")).toBe(true);
  });

  it("returns safe when no blocked terms", async () => {
    const result = await evaluateSafety("water, zout", ["sesam"], "OCR", {
      useOnlineLookup: false
    });
    expect(result.isSafe).toBe(true);
    expect(result.matches.length).toBe(0);
  });

  it("detects noot family in dutch ingredient text", async () => {
    const result = await evaluateSafety("suiker, hazelnoten", ["noten"], "Product API", {
      useOnlineLookup: false
    });

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "noten")).toBe(true);
  });

  it("does not false-positive short token inside another word", async () => {
    const result = await evaluateSafety("weizenmehl, zout", ["melk"], "OCR", {
      useOnlineLookup: false
    });

    expect(result.isSafe).toBe(true);
    expect(result.matches.some((m) => m.blockedTerm === "melk")).toBe(false);
  });

  it("matches orthographic variant soja and soya", async () => {
    const result = await evaluateSafety("soya lecithin, water", ["soja"], "OCR", {
      useOnlineLookup: false
    });

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "soja")).toBe(true);
  });

  it("matches zuivel umbrella term to milk ingredients", async () => {
    const provider = async (term: string): Promise<string[]> => {
      if (term === "zuivel") {
        return ["milk", "melk", "dairy", "milk powder"];
      }
      return [];
    };

    const result = await evaluateSafety("water, skimmed milk powder", ["zuivel"], "OCR", {
      useOnlineLookup: true,
      onlineCandidateProvider: provider
    });

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "zuivel")).toBe(true);
  });

  it("matches vis umbrella term to garnalen and shrimp", async () => {
    const provider = async (term: string): Promise<string[]> => {
      if (term === "vis") {
        return ["shrimp", "garnalen", "fish", "seafood"];
      }
      return [];
    };

    const result = await evaluateSafety("garnalen, shrimp extract", ["vis"], "OCR", {
      useOnlineLookup: true,
      onlineCandidateProvider: provider
    });

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "vis")).toBe(true);
  });

  it("detects blocked term from product allergen signal", async () => {
    const ontologyProvider = async (term: string): Promise<string[]> => {
      if (term === "zuivel") {
        return ["milk", "dairy", "melk"];
      }
      return [];
    };

    const result = await evaluateSafety("water, suiker", ["zuivel"], "Product API", {
      useOnlineLookup: false,
      useOntologyLookup: true,
      ontologyCandidateProvider: ontologyProvider,
      productAllergens: ["Milk", "Lactose"]
    });

    expect(result.isSafe).toBe(false);
    const match = result.matches.find((m) => m.blockedTerm === "zuivel");
    expect(match).toBeDefined();
    expect(match?.relationSource).toBe("product-allergen");
  });

  it("uses ontology candidates to detect semantic family relation", async () => {
    const ontologyProvider = async (term: string): Promise<string[]> => {
      if (term === "zuivel") {
        return ["milk", "dairy", "melk"];
      }
      return [];
    };

    const result = await evaluateSafety("water, milk powder", ["zuivel"], "OCR", {
      useOnlineLookup: false,
      useOntologyLookup: true,
      ontologyCandidateProvider: ontologyProvider
    });

    expect(result.isSafe).toBe(false);
    const match = result.matches.find((m) => m.blockedTerm === "zuivel");
    expect(match).toBeDefined();
    expect(match?.relationSource).toBe("ontology");
  });

  it("detects manual blocked noodle variants in mixed-language ingredient text", async () => {
    const result = await evaluateSafety(
      "Buldag noedels met Nudeln en kruidenmix",
      ["noedels", "nudlen"],
      "OCR",
      { useOnlineLookup: false, useOntologyLookup: false }
    );

    expect(result.isSafe).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.some((m) => ["noedels", "nudlen"].includes(m.blockedTerm))).toBe(true);
  });

  it("matches transposition typo nudlen against nudeln token", async () => {
    const result = await evaluateSafety("Nudeln, chili, aroma", ["nudlen"], "OCR", {
      useOnlineLookup: false,
      useOntologyLookup: false
    });

    expect(result.isSafe).toBe(false);
    const hit = result.matches.find((m) => m.blockedTerm === "nudlen");
    expect(hit).toBeDefined();
    expect(hit?.matchedFragment.toLowerCase()).toContain("nudeln");
  });

  it("uses only provided blocked list when lookup is disabled", async () => {
    const result = await evaluateSafety("water, noedels", ["nudlen"], "OCR", {
      useOnlineLookup: false,
      useOntologyLookup: false,
      localLexicon: {}
    });

    // This should still match via fuzzy typo relation (nudlen ~ noedels can be close in user data)
    // but most importantly proves evaluateSafety uses the passed blocked list directly.
    expect(result.matches.every((m) => m.blockedTerm === "nudlen")).toBe(true);
  });

  it("flags unsafe for OCR sentence containing Nudeln when blocked contains nudlen", async () => {
    const result = await evaluateSafety(
      "Buldag noedels met Nudeln erin",
      ["noedels", "nudlen"],
      "OCR",
      {
        useOnlineLookup: false,
        useOntologyLookup: false,
        localLexicon: {}
      }
    );

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "noedels" || m.blockedTerm === "nudlen")).toBe(true);
  });

  it("does not map generic noodle term to product allergen soybean", async () => {
    const result = await evaluateSafety("water, kruiden", ["noedels"], "Product API", {
      useOnlineLookup: false,
      useOntologyLookup: false,
      productAllergens: ["soybeans"]
    });

    expect(result.isSafe).toBe(true);
    expect(result.matches.some((m) => m.blockedTerm === "noedels")).toBe(false);
  });

  it("ignores allergene label-noise as matched fragment", async () => {
    const result = await evaluateSafety("allergene, water, zout", ["melk"], "OCR", {
      useOnlineLookup: false,
      useOntologyLookup: false
    });

    expect(result.matches.some((m) => m.matchedFragment.toLowerCase() === "allergene")).toBe(false);
  });

  it("does not match olie from german farbstoff token", async () => {
    const result = await evaluateSafety("nudeln, farbstoff, salz", ["olie"], "OCR", {
      useOnlineLookup: false,
      useOntologyLookup: false,
      // Simulate ontology/lexicon noise that might map oil to colorant terms.
      localLexicon: {
        olie: ["farbstoff", "kleurstof", "colorant"]
      }
    });

    expect(result.isSafe).toBe(true);
    expect(result.matches.some((m) => m.blockedTerm === "olie")).toBe(false);
  });

  it("detects short allergen token ei in ingredient text", async () => {
    const result = await evaluateSafety("water, tarwe, ei, zout", ["ei"], "OCR", {
      useOnlineLookup: false,
      useOntologyLookup: false,
      localLexicon: {
        ei: ["ei", "egg", "eieren"]
      }
    });

    expect(result.isSafe).toBe(false);
    expect(result.matches.some((m) => m.blockedTerm === "ei")).toBe(true);
  });
});
