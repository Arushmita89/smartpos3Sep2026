const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cached: { at: number; rates: Record<string, number> } | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.rates;
  }
  try {
    const res = await fetch(FX_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('FX request failed');
    const data = await res.json();
    const rates: Record<string, number> = data?.rates || {};
    if (Object.keys(rates).length > 0) {
      cached = { at: Date.now(), rates };
      return rates;
    }
    return cached?.rates || {};
  } catch {
    return cached?.rates || {};
  }
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string
): Promise<number | null> {
  const fromU = (from || '').toUpperCase();
  const toU = (to || '').toUpperCase();
  if (!fromU || !toU || fromU === toU) return amount;
  const rates = await getExchangeRates();
  if (!rates[fromU] || !rates[toU]) return null;
  return (amount / rates[fromU]) * rates[toU];
}
