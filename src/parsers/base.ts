/**
 * Helper to normalize and parse raw amount string into number (preserving decimals)
 */
export function parseRawAmount(raw: string): number | null {
  if (!raw) return null;
  // Normalize full-width digits, commas, and dots to half-width
  const normalized = raw
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    .replace(/,/g, '')
    .trim();

  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Helper to normalize and parse amount strings into integer number
 */
export function parseAmount(raw: string): number | null {
  const num = parseRawAmount(raw);
  return num !== null ? Math.round(num) : null;
}

/**
 * Helper to parse various Japanese date strings or fallback to message date
 */
export function parseDateTime(rawDate: string | undefined, fallback: Date): Date {
  if (!rawDate) return fallback;

  // Patterns like "2026/09/27 12:34", "2026-09-27 12:34", "2026年9月27日 12:34"
  const m = rawDate.match(
    /(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})日?(?:\s+(\d{1,2}):(\d{1,2}))?/
  );
  if (!m) return fallback;

  const jstTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const fallbackParts = jstTimeFormatter.formatToParts(fallback);
  const fallbackHour = fallbackParts.find((p) => p.type === 'hour')?.value ?? '00';
  const fallbackMinute = fallbackParts.find((p) => p.type === 'minute')?.value ?? '00';

  const year = m[1];
  const month = m[2].padStart(2, '0');
  const day = m[3].padStart(2, '0');
  const hour = m[4] ? m[4].padStart(2, '0') : fallbackHour;
  const minute = m[5] ? m[5].padStart(2, '0') : fallbackMinute;

  // Explicitly parse in Asia/Tokyo (JST, +09:00)
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00+09:00`);
}

/**
 * Clean up shop/merchant name string
 */
export function cleanShopName(raw: string | undefined): string {
  if (!raw) return '不明';
  return raw.replace(/[\r\n\t]+/g, ' ').trim() || '不明';
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '＄': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '￥': 'JPY',
  '¥': 'JPY',
};

export interface ExtractedAmount {
  amount: number;
  currency: string;
}

/**
 * Extract spend amount and currency code flexibly from email body
 */
export function extractSpendAmount(
  body: string,
  keywords: string[] = ['ご利用金額', '利用金額', '決済金額']
): ExtractedAmount | null {
  const kw = keywords.join('|');
  const regex = new RegExp(
    `(?:${kw})[^0-9$€£¥￥＄\\r\\n]*?([$€£¥￥＄])?\\s*([0-9,０-９，]+(?:[.\\uff0e][0-9０-９]+)?)\\s*(円|JPY|USD|EUR|GBP|AUD|CAD|CHF|CNY|KRW|SGD|TWD|HKD)?`,
    'i'
  );
  const match = body.match(regex);
  if (!match) return null;

  const prefixSymbol = match[1];
  const numStr = match[2];
  const suffixUnit = match[3];

  let currency = 'JPY';
  if (suffixUnit) {
    const s = suffixUnit.toUpperCase();
    currency = s === '円' ? 'JPY' : s;
  } else if (prefixSymbol) {
    currency = CURRENCY_SYMBOLS[prefixSymbol] || 'JPY';
  }

  const rawNum = parseRawAmount(numStr);
  if (rawNum === null) return null;

  const amount = currency === 'JPY' ? Math.round(rawNum) : rawNum;
  return {
    amount,
    currency,
  };
}

/**
 * Extract spend amount flexibly from email body (fallback helper)
 */
export function extractAmount(
  body: string,
  keywords: string[] = ['ご利用金額', '利用金額', '決済金額']
): number | null {
  const res = extractSpendAmount(body, keywords);
  return res ? res.amount : null;
}

/**
 * Extract shop / merchant name flexibly from email body
 */
export function extractShop(
  body: string,
  keywords: string[] = ['ご利用先', '利用先', '利用加盟店', '加盟店']
): string {
  const kw = keywords.join('|');
  const regex = new RegExp(`(?:${kw})[^：:\\r\\n]*?[：:\\s】　]+([^\\r\\n]+)`);
  const match = body.match(regex);
  return cleanShopName(match ? match[1] : undefined);
}

/**
 * Extract datetime flexibly from email body
 */
export function extractDateTime(
  body: string,
  fallback: Date,
  keywords: string[] = ['ご利用日時', '利用日時', 'ご利用日', '利用日']
): Date {
  const kw = keywords.join('|');
  const regex = new RegExp(`(?:${kw})[^0-9\\r\\n]*?([0-9０-９]{4}[/\\-年][^\\r\\n]+)`);
  const match = body.match(regex);
  return parseDateTime(match ? match[1] : undefined, fallback);
}
