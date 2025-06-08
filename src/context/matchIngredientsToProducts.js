import stringSimilarity from "string-similarity";

// Hebrew fraction support
const fractionMap = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
};

const normalizeName = (name) =>
  (name || "")
    .replace(/[\(\[].*?[\)\]]/g, "") // Remove parenthesis content
    .replace(/[.,/#!$%^&*;:{}=\-_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const simplifyUnit = (unit) => {
  if (!unit) return "";
  if (unit.includes("כפ")) return "כפית/ות";
  if (unit.includes("כף")) return "כף/פות";
  if (unit.includes("כוס")) return "כוס/ות";
  if (unit.includes("גרם") || unit.includes("ג")) return "גרם/ים";
  return unit;
};

const parseLine = (line) => {
  let normalizedLine = line.replace(/[¼½¾⅓⅔⅕⅖⅗⅘]/g, (m) => fractionMap[m] ?? m);

  const match = normalizedLine.match(
    /([\d./]+)?\s*(כוסות|כוס|כפיות|כפית|כף|גרם|גרמים|מיליליטרים|ק״ג|יחידות)?\s*(.+)/
  );

  if (match) {
    const [, qtyRaw, unitRaw, nameRaw] = match;
    const quantity = qtyRaw ? eval(qtyRaw) : 1;
    const unit = simplifyUnit(unitRaw || "");
    const name = normalizeName(nameRaw);
    return { name, unit, quantity };
  }

  return null;
};

/**
 * Main function: gets an ingredient list, finds the best food product for each, merges duplicates.
 */
const matchIngredientsToProducts = (recipeText, availableProducts = []) => {
  // Only look at food categories!
  const foodCategories = [
    "מזון יבש",
    "מוצרי חלב",
    "בשר",
    "פירות וירקות",
    "מאפים",
    "משקאות",
    "דגנים",
    "קפואים",
    "טבעוני",
    "מוצרי קירור",
  ];

  // Filter out irrelevant categories (פארם, סבון וכו׳)
  const foodProducts = availableProducts.filter(
    (p) =>
      p &&
      p.item_name &&
      foodCategories.some((cat) => (p.category || "").includes(cat))
  );

  const lines = recipeText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines.map(parseLine).filter(Boolean);

  // Merge duplicates by normalized name + unit
  const merged = {};

  parsed.forEach(({ name, unit, quantity }) => {
    // Use string similarity to find the closest product
    const candidates = foodProducts.map((p) => p.item_name);
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
      name,
      candidates
    );

    // Only use strong matches (you can tweak threshold)
    let matchedName = name;
    let matchedCategory = "לא ידוע";
    if (bestMatch.rating > 0.35 && foodProducts[bestMatchIndex]) {
      matchedName = foodProducts[bestMatchIndex].item_name;
      matchedCategory = foodProducts[bestMatchIndex].category || "לא ידוע";
    }

    const key = `${matchedName}_${unit}`;
    if (!merged[key]) {
      merged[key] = {
        name: matchedName,
        unit,
        quantity,
        category: matchedCategory,
      };
    } else {
      merged[key].quantity += quantity;
    }
  });

  return Object.values(merged);
};

export default matchIngredientsToProducts;
