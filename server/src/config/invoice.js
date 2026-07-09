const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const invoiceConfig = {
  currency: process.env.INVOICE_CURRENCY || "PKR",
  taxRate: toNumber(process.env.INVOICE_TAX_RATE, 0),
  defaultDeliveryMethod:
    process.env.DEFAULT_DELIVERY_METHOD || "Standard Delivery",
  seller: {
    legalName: process.env.SELLER_LEGAL_NAME || "ShopFlowAI Technologies",
    businessAddress:
      process.env.SELLER_BUSINESS_ADDRESS ||
      "Okara, Punjab, Pakistan",
    taxId: process.env.SELLER_TAX_ID || "Tax/VAT/GST ID: N/A",
    supportEmail: process.env.SELLER_SUPPORT_EMAIL || "shopflowai.dev@gmail.com",
    supportPhone: process.env.SELLER_SUPPORT_PHONE || "+923346956216",
  },
};

module.exports = invoiceConfig;
