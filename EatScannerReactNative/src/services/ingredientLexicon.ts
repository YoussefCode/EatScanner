import { normalizeValue, stemValue } from "./parser";

const LEXICON_GROUPS: Record<string, string[]> = {
  noot: [
    "noot",
    "noten",
    "hazelnoot",
    "hazelnoten",
    "walnoot",
    "walnoten",
    "amandel",
    "amandelen",
    "cashew",
    "cashews",
    "pistache",
    "pistachenoot",
    "pistachenoten",
    "nut",
    "nuts",
    "hazelnut",
    "hazelnuts",
    "walnut",
    "walnuts",
    "almond",
    "almonds",
    "pistachio",
    "pistachios"
  ],
  melk: [
    "melk",
    "melkpoeder",
    "lactose",
    "caseine",
    "caseinaat",
    "wei",
    "milk",
    "milk powder",
    "skimmed milk powder",
    "whey",
    "casein"
  ],
  suiker: [
    "suiker",
    "sucrose",
    "glucose",
    "fructose",
    "dextrose",
    "suikers",
    "sugar",
    "sugars",
    "glucose syrup",
    "corn syrup"
  ],
  gluten: [
    "gluten",
    "tarwe",
    "tarwebloem",
    "gerst",
    "rogge",
    "spelt",
    "wheat",
    "wheat flour",
    "barley",
    "rye",
    "spelt"
  ],
  sesam: ["sesam", "sesamzaad", "tahin", "sesame", "sesame seed", "tahini"]
};

export function lexiconCandidates(blockedTerm: string): Set<string> {
  const normalizedBlocked = normalizeValue(blockedTerm);
  if (!normalizedBlocked) {
    return new Set();
  }

  const result = new Set<string>([normalizedBlocked, stemValue(normalizedBlocked)]);
  const blockedStem = stemValue(normalizedBlocked);

  for (const values of Object.values(LEXICON_GROUPS)) {
    const normalizedValues = values.map((value) => normalizeValue(value));
    const hasMatch = normalizedValues.some(
      (value) => value === normalizedBlocked || value === blockedStem || stemValue(value) === blockedStem
    );

    if (hasMatch) {
      for (const value of normalizedValues) {
        if (!value) continue;
        result.add(value);
        result.add(stemValue(value));
      }
      break;
    }
  }

  return new Set(Array.from(result).filter(Boolean));
}
