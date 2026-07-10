const axios = require("axios");
const ApiError = require("./apiError");

const getTimeoutMs = () => {
  const value = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 1000 ? value : 5000;
};

const getPKRtoUSDQuote = async (amountInPKR) => {
  let usdRate;

  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/PKR`,
      { timeout: getTimeoutMs() },
    );
    usdRate = Number(response.data?.conversion_rates?.USD);
  } catch (error) {
    console.error("Exchange rate API error:", error.message);
    throw new ApiError(
      503,
      "Currency conversion service is temporarily unavailable",
    );
  }

  if (!Number.isFinite(usdRate) || usdRate <= 0) {
    throw new ApiError(503, "Unable to fetch a valid USD exchange rate");
  }

  const amountMinor = Math.round(Number(amountInPKR) * usdRate * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) {
    throw new ApiError(400, "Unable to calculate a valid payment amount");
  }

  return { amountMinor, rate: usdRate, currency: "usd" };
};

const convertPKRtoUSD = async (amountInPKR) =>
  (await getPKRtoUSDQuote(amountInPKR)).amountMinor;

module.exports = {
  convertPKRtoUSD,
  getPKRtoUSDQuote,
};
