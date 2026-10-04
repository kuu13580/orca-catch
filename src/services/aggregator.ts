import { APP_CONFIG } from '../config/app';
import { AggregationResult, AppConfig, EmailMessage, SpendItem, UnparsedEmail } from '../config/types';
import { createDefaultRegistry } from '../parsers';
import { ParserRegistry } from '../parsers/registry';
import { ExchangeRateProvider, GasExchangeRateProvider } from './currency';

export interface EmailFetcher {
  searchEmails(query: string): EmailMessage[];
}

/**
 * Default Gmail fetcher running inside Google Apps Script environment
 */
export class GasEmailFetcher implements EmailFetcher {
  searchEmails(query: string): EmailMessage[] {
    if (typeof GmailApp === 'undefined') {
      console.warn('GmailApp is not defined in this environment.');
      return [];
    }

    const threads = GmailApp.search(query, 0, 100);
    const messages: EmailMessage[] = [];

    for (const thread of threads) {
      const threadMessages = thread.getMessages();
      for (const msg of threadMessages) {
        messages.push({
          id: msg.getId(),
          subject: msg.getSubject(),
          from: msg.getFrom(),
          body: msg.getPlainBody(),
          date: new Date(msg.getDate().getTime()),
        });
      }
    }

    return messages;
  }
}

/**
 * Service to aggregate credit card spending for a specific date
 */
export class SpendAggregatorService {
  private registry: ParserRegistry;
  private fetcher: EmailFetcher;
  private config: AppConfig;
  private rateProvider: ExchangeRateProvider;

  constructor(
    registry: ParserRegistry = createDefaultRegistry(),
    fetcher: EmailFetcher = new GasEmailFetcher(),
    config: AppConfig = APP_CONFIG,
    rateProvider: ExchangeRateProvider = new GasExchangeRateProvider()
  ) {
    this.registry = registry;
    this.fetcher = fetcher;
    this.config = config;
    this.rateProvider = rateProvider;
  }

  /**
   * Aggregate spending for a given date in YYYY-MM-DD format (Asia/Tokyo timezone)
   */
  aggregateForDate(targetDateStr: string): AggregationResult {
    // Parse target date (local JST date)
    const [year, month, day] = targetDateStr.split('-').map(Number);

    // Gmail search query date boundaries (UTC-safe ±1 day window)
    const prevDate = new Date(Date.UTC(year, month - 1, day - 1));
    const nextDate = new Date(Date.UTC(year, month - 1, day + 2));

    const formatDateForQuery = (d: Date) =>
      `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;

    const searchQuery = this.registry.buildCombinedSearchQuery({
      afterDateStr: formatDateForQuery(prevDate),
      beforeDateStr: formatDateForQuery(nextDate),
      labelFilter: this.config.labelFilter,
    });

    const emails = this.fetcher.searchEmails(searchQuery);

    const items: SpendItem[] = [];
    const unparsedEmails: UnparsedEmail[] = [];

    for (const email of emails) {
      const { item, unparsed } = this.registry.dispatch(email);
      if (item) {
        if (this.isSameDayJST(item.date, targetDateStr)) {
          // Convert foreign currency to JPY if needed
          if (item.currency && item.currency !== 'JPY' && typeof item.originalAmount === 'number') {
            const rate = this.rateProvider.getRateToJPY(item.currency);
            item.rate = rate;
            item.amount = Math.round(item.originalAmount * rate);
          }
          items.push(item);
        }
      } else if (unparsed) {
        if (this.isSameDayJST(unparsed.date, targetDateStr)) {
          unparsedEmails.push(unparsed);
        }
      }
    }

    // Sort items by date descending (newest first)
    items.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate total and subtotals
    let totalAmount = 0;
    const subtotals: AggregationResult['subtotals'] = {};

    for (const item of items) {
      totalAmount += item.amount;
      if (!subtotals[item.cardId]) {
        subtotals[item.cardId] = {
          cardName: item.cardName,
          amount: 0,
          count: 0,
        };
      }
      subtotals[item.cardId].amount += item.amount;
      subtotals[item.cardId].count += 1;
    }

    return {
      targetDate: targetDateStr,
      totalAmount,
      subtotals,
      items,
      unparsedEmails,
    };
  }

  /**
   * Helper to check if a date falls on the target calendar day in JST (Asia/Tokyo)
   */
  private isSameDayJST(date: Date, targetDateStr: string): boolean {
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}` === targetDateStr;
  }
}
