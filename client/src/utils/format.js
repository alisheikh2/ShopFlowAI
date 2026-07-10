export const formatCurrency = (amount) =>
  `PKR ${Number(amount || 0).toLocaleString('en-PK', {
    maximumFractionDigits: 0,
  })}`
