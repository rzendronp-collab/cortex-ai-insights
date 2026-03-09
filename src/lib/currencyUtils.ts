const currencySymbolMap: Record<string, string> = {
  BRL: 'R$',
  EUR: '€',
  USD: '$',
  GBP: '£',
  MXN: 'MX$',
  COP: 'COP$',
};

export function getCurrencySymbol(currency: string | null | undefined): string {
  if (!currency) return 'R$';
  return currencySymbolMap[currency.toUpperCase()] || currency;
}
