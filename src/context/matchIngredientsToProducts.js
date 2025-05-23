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

const normalizeName = (name) => {
  return name
    .replace(/[\(\[].*?[\)\]]/g, "") // Remove parenthesis content
    .replace(/[.,/#!$%^&*;:{}=\-_`~]/g, "")
    .replace(/\s+/g, " ") // Collapse spaces
    .trim();
};

const simplifyUnit = (unit) => {
  if (!unit) return "";
  if (unit.includes("כפ")) return "כפית/ות";
  if (unit.includes("כף")) return "כף/ות";
  if (unit.includes("כוס")) return "כוס/ות";
  if (unit.includes("גרם") || unit.includes("ג")) return "גרמ/ים";
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

const matchIngredientsToProducts = (recipeText, availableProducts = []) => {
  const lines = recipeText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines.map(parseLine).filter(Boolean);

  // Merge duplicates
  const merged = {};
  parsed.forEach(({ name, unit, quantity }) => {
    const baseMatch = availableProducts.find(
      (p) => name.includes(p.name) || p.name.includes(name)
    );
    const matchedName = baseMatch ? baseMatch.name : name;

    const key = `${matchedName}_${unit}`;
    if (!merged[key]) {
      merged[key] = {
        name: matchedName,
        unit,
        quantity,
        category: baseMatch?.category || "לא ידוע",
      };
    } else {
      merged[key].quantity += quantity;
    }
  });

  return Object.values(merged);
};

export default matchIngredientsToProducts;
