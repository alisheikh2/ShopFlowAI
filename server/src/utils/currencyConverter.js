const axios = require("axios");
const ApiError = require("./apiError");

const convertPKRtoUSD = async (amountInPKR) => {
  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/PKR`
    );

    const usdRate = response.data.conversion_rates.USD;

    if (!usdRate) {
      throw new ApiError(500, "Unable to fetch USD exchange rate");
    }

    const amountInUSD = amountInPKR * usdRate;

    return Math.round(amountInUSD * 100);
  } catch (error) {
    throw new ApiError(
      503,
      "Currency conversion service is temporarily unavailable"
    );
  }
};

module.exports = {
  convertPKRtoUSD,
};