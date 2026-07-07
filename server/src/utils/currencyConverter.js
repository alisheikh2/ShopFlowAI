const axios = require("axios");
const ApiError = require("./apiError");

const convertPKRtoUSD = async (amountInPKR) => {
  let usdRate;

  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/PKR`,
    );

    usdRate = response.data.conversion_rates.USD;
  } catch (error) {
    console.error("Exchange rate API error:", error.message);
    throw new ApiError(
      503,
      "Currency conversion service is temporarily unavailable",
    );
  }

  if (!usdRate) {
    console.error("Exchange rate API response missing USD rate");
    throw new ApiError(500, "Unable to fetch USD exchange rate");
  }

  const amountInUSD = amountInPKR * usdRate;
  return Math.round(amountInUSD * 100);
};

module.exports = {
  convertPKRtoUSD,
};
