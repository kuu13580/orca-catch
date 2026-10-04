/**
 * Currency exchange rate service using Frankfurter API (free, open-source ECB rates)
 */
export interface ExchangeRateProvider {
  getRateToJPY(currency: string): number;
}

// Fallback rates if API is unavailable or in offline environments
export const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 150.0,
  EUR: 165.0,
  GBP: 195.0,
  AUD: 100.0,
  CAD: 110.0,
  CHF: 175.0,
  CNY: 21.0,
  KRW: 0.11,
  SGD: 115.0,
  TWD: 4.8,
  HKD: 19.5,
};

/**
 * Exchange rate provider for Google Apps Script environment with script cache
 */
export class GasExchangeRateProvider implements ExchangeRateProvider {
  getRateToJPY(currency: string): number {
    const upperCurrency = currency.toUpperCase();
    if (upperCurrency === 'JPY') return 1.0;

    // Check GAS Script Cache if available
    let cache: GoogleAppsScript.Cache.Cache | null = null;
    if (typeof CacheService !== 'undefined') {
      try {
        cache = CacheService.getScriptCache();
        const cachedRate = cache.get(`fx_${upperCurrency}_JPY`);
        if (cachedRate) {
          const parsed = parseFloat(cachedRate);
          if (!Number.isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Cache access failed:', e);
      }
    }

    // Fetch from Frankfurter API
    if (typeof UrlFetchApp !== 'undefined') {
      try {
        const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(upperCurrency)}&to=JPY`;
        const response = UrlFetchApp.fetch(url, {
          muteHttpExceptions: true,
        });

        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());
          const rate = data?.rates?.JPY;
          if (typeof rate === 'number' && rate > 0) {
            // Cache for 6 hours (21600 seconds)
            if (cache) {
              try {
                cache.put(`fx_${upperCurrency}_JPY`, String(rate), 21600);
              } catch (e) {
                console.warn('Cache write failed:', e);
              }
            }
            return rate;
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch exchange rate for ${upperCurrency}:`, err);
      }
    }

    // Fallback if network or API failed
    return DEFAULT_FALLBACK_RATES[upperCurrency] ?? 150.0;
  }
}

/**
 * Mock exchange rate provider for tests
 */
export class MockExchangeRateProvider implements ExchangeRateProvider {
  private rates: Record<string, number>;

  constructor(customRates: Record<string, number> = {}) {
    this.rates = { ...DEFAULT_FALLBACK_RATES, ...customRates };
  }

  getRateToJPY(currency: string): number {
    const upperCurrency = currency.toUpperCase();
    if (upperCurrency === 'JPY') return 1.0;
    return this.rates[upperCurrency] ?? 150.0;
  }
}
