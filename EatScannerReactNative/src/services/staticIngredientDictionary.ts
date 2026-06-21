const BASE_INGREDIENTS = ["Ei", "Perzik", "Appel", "Peer"] as const;

export const STATIC_INGREDIENT_GROUPS: Record<string, string[]> = Object.fromEntries(
  BASE_INGREDIENTS.map((term) => [term, [term]])
);

// Ei group: Dutch + EN/DE/FR/ES variants and common ingredient labels.
STATIC_INGREDIENT_GROUPS.Ei = [
  "ei",
  "eieren",
  "eigeel",
  "eiwit",
  "kippenei",
  "eier",
  "egg",
  "eggs",
  "egg yolk",
  "egg white",
  "albumen",
  "albumin",
  "ovalbumin",
  "ovomucoid",
  "lysozyme",
  "huevo",
  "huevos",
  "oeuf",
  "oeufs",
  "eiweiss",
  "eiklar",
  "eigelb"
];

// Perzik group: Dutch + EN/DE/FR/ES variants and common ingredient labels.
STATIC_INGREDIENT_GROUPS.Perzik = [
  "perzik",
  "perziken",
  "peach",
  "peaches",
  "pfirsich",
  "pfirsiche",
  "peche",
  "peches",
  "melocoton",
  "melocotones"
];

// Appel group: Dutch + EN/DE/FR/ES variants and common ingredient labels.
STATIC_INGREDIENT_GROUPS.Appel = [
  "appel",
  "appels",
  "apple",
  "apples",
  "apfel",
  "apfeln",
  "pomme",
  "pommes",
  "manzana",
  "manzanas"
];

// Peer group: Dutch + EN/DE/FR/ES variants and common ingredient labels.
STATIC_INGREDIENT_GROUPS.Peer = [
  "peer",
  "peren",
  "pear",
  "pears",
  "birne",
  "birnen",
  "poire",
  "poires",
  "pera",
  "peras"
];

export const STATIC_INGREDIENT_DICTIONARY: string[] = Object.keys(STATIC_INGREDIENT_GROUPS);

export function buildStaticLexicon(selectedTerms: string[]): Record<string, string[]> {
  const entries = selectedTerms.map((term) => {
    const values = STATIC_INGREDIENT_GROUPS[term] ?? [term];
    const key = term.toLowerCase().trim();
    return [key, Array.from(new Set(values.map((v) => v.toLowerCase().trim()).filter(Boolean)))];
  });

  return Object.fromEntries(entries);
}
