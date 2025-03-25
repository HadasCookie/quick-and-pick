const matchIngredientsToProducts = (recipeText, products = []) => {
  if (!Array.isArray(products)) {
    console.error("Error: products is not an array", products);
    return [];
  }

  const ingredientLines = recipeText.split("\n").map((line) => line.trim());

  const matchedItems = ingredientLines
    .map((line) => {
      const words = line.split(" ");
      for (const product of products) {
        if (
          typeof product.name === "string" &&
          words.some((word) => product.name.includes(word))
        ) {
          return {
            name: product.name,
            quantity: extractQuantity(line),
            unit: extractUnit(line),
          };
        }
      }
      return null;
    })
    .filter((item) => item !== null);

  return matchedItems;
};

const extractQuantity = (line) => {
  const match = line.match(/(\d+)/);
  return match ? parseInt(match[0], 10) : 1;
};

const extractUnit = (line) => {
  const match = line.match(/(גרם|מ"ל|כוסות|כפיות|כפות|יחידות)/);
  return match ? match[0] : "יחידות";
};

export default matchIngredientsToProducts;
