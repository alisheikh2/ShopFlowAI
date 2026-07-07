const model = require("../utils/gemini");
const ApiError = require("../utils/apiError");

const generateProductDescription = async ({
  name,
  category,
  brand,
  price,
  features,
}) => {
  const prompt = `
You are an expert ecommerce copywriter.

Generate a professional product description.

Product Information:

- Product Name: ${name}
- Category: ${category}
- Brand: ${brand}
${price ? `- Price: ${price}` : ""}
- Features: ${features.join(", ")}

Rules:

- Write 120-180 words.
- Make it SEO friendly.
- Maintain a professional, natural tone.
- Before writing, carefully analyze the provided product information and identify the most important selling points.
- Prioritize practical customer benefits over simply listing technical specifications.
- Organize the description logically: introduction → key features → customer benefits → concluding summary.
- Highlight the product's key features and benefits naturally.
${price ? "- You may use the price to position the product appropriately (e.g. value, mid-range, or premium) without stating the number as a sales pitch." : ""}
- Do not invent specifications or features that were not provided.
- Do not use exaggerated or generic marketing language.
- Avoid phrases such as:
  - "Experience the future"
  - "Revolutionary product"
  - "Game-changing"
  - "Pinnacle of innovation"
  - "Next-level technology"
- Do not add a call-to-action.
- Do not use emojis.
- Do not repeat the product name more than once.
- Avoid filler sentences. Every sentence should describe a feature or its practical benefit.
- Return only the product description as plain text.
`;

  try {
    const result = await model.generateContent(prompt);

    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("Gemini AI generation error:", error.message);
    throw new ApiError(
      503,
      "AI service is temporarily unavailable. Please try again later.",
    );
  }
};

module.exports = {
  generateProductDescription,
};
