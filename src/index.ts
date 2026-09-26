import { SpendAggregatorService } from './services/aggregator';

/**
 * Interface returned to client-side Web App
 */
export interface ClientSpendResponse {
  success: boolean;
  targetDate: string;
  formattedTargetDate: string;
  totalAmount: number;
  subtotals: Array<{
    cardId: string;
    cardName: string;
    amount: number;
    count: number;
  }>;
  items: Array<{
    id: string;
    cardId: string;
    cardName: string;
    amount: number;
    shop: string;
    timeStr: string;
  }>;
  unparsedEmails: Array<{
    id: string;
    subject: string;
    from: string;
    timeStr: string;
    reason: string;
  }>;
  error?: string;
}

/**
 * Format Date to YYYY-MM-DD in JST
 */
export function getTodayJST(): string {
  const now = new Date();
  const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = jstFormatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD into Japanese string with weekday (e.g. 2026年9月27日 (日))
 */
export function formatJapaneseDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${year}年${month}月${day}日 (${weekdays[d.getDay()]})`;
}

/**
 * Server-side function called by client-side google.script.run
 */
export function getSpendData(targetDateStr?: string): ClientSpendResponse {
  try {
    const dateStr = targetDateStr || getTodayJST();
    const service = new SpendAggregatorService();
    const rawResult = service.aggregateForDate(dateStr);

    const subtotals = Object.entries(rawResult.subtotals).map(([cardId, val]) => ({
      cardId,
      cardName: val.cardName,
      amount: val.amount,
      count: val.count,
    }));

    const items = rawResult.items.map((item) => {
      const timeStr = item.date.toLocaleTimeString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        id: item.id,
        cardId: item.cardId,
        cardName: item.cardName,
        amount: item.amount,
        shop: item.shop,
        timeStr,
      };
    });

    const unparsedEmails = rawResult.unparsedEmails.map((email) => {
      const timeStr = email.date.toLocaleTimeString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        id: email.id,
        subject: email.subject,
        from: email.from,
        timeStr,
        reason: email.reason,
      };
    });

    return {
      success: true,
      targetDate: dateStr,
      formattedTargetDate: formatJapaneseDate(dateStr),
      totalAmount: rawResult.totalAmount,
      subtotals,
      items,
      unparsedEmails,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      targetDate: targetDateStr || '',
      formattedTargetDate: '',
      totalAmount: 0,
      subtotals: [],
      items: [],
      unparsedEmails: [],
      error: message,
    };
  }
}

/**
 * HTTP GET entrypoint for Web App
 */
export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  const output = HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('orca-catch 🐋⚡')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  return output;
}

/**
 * HTTP POST entrypoint for future Webhook / LINE Bot integrations
 */
export function doPost(
  e: GoogleAppsScript.Events.DoPost
): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', message: 'orca-catch webhook endpoint' })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Expose GAS entrypoints to global scope
declare const global: Record<string, unknown>;
const gasGlobal = typeof globalThis !== 'undefined' ? globalThis : global;
(gasGlobal as Record<string, unknown>).doGet = doGet;
(gasGlobal as Record<string, unknown>).doPost = doPost;
(gasGlobal as Record<string, unknown>).getSpendData = getSpendData;
