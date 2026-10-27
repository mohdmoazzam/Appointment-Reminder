/** "450.00" + "INR" → "₹450.00" (formatted for the browser's locale). */
export function formatPrice(price: string, currency: string): string {
  const amount = Number(price);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    // Unknown currency code: still show the amount.
    return `${price} ${currency}`;
  }
}

/** Every ISO 4217 currency the browser knows, as <select> options: "INR – Indian Rupee". */
export function getCurrencyOptions(selected?: string): { value: string; label: string }[] {
  const names = new Intl.DisplayNames(['en'], { type: 'currency' });
  const codes = new Set(Intl.supportedValuesOf('currency'));
  if (selected) codes.add(selected);

  return [...codes]
    .sort()
    .map((code) => ({ value: code, label: `${code} – ${names.of(code) ?? code}` }));
}
