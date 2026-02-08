export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatCurrency(amountMinor: number | null | undefined, currency = "GBP") {
  if (amountMinor === null || amountMinor === undefined) return "";
  const amount = amountMinor / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency
  }).format(amount);
}
