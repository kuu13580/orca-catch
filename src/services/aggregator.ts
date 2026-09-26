import { APP_CONFIG } from '../config/app';
import { AggregationResult, AppConfig, EmailMessage, SpendItem, UnparsedEmail } from '../config/types';
import { createDefaultRegistry } from '../parsers';
import { ParserRegistry } from '../parsers/registry';

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

  constructor(
    registry: ParserRegistry = createDefaultRegistry(),
    fetcher: EmailFetcher = new GasEmailFetcher(),
    config: AppConfig = APP_CONFIG
  ) {
    this.registry = registry;
    this.fetcher = fetcher;
    this.config = config;
  }

  /**
   * Aggregate spending for a given date in YYYY-MM-DD format (Asia/Tokyo timezone)
   */
  aggregateForDate(targetDateStr: string): AggregationResult {
    // Parse target date (local JST date)
    const [yearStr, monthStr, dayStr] = targetDateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const targetDate = new Date(year, month, day);

    // Gmail search query date boundaries
    // Include 1 day before and 1 day after to safely cover timezone differences
    const prevDate = new Date(year, month, day - 1);
    const nextDate = new Date(year, month, day + 2);

    const formatDateForQuery = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

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
        // Strict date check in JST (Asia/Tokyo)
        if (this.isSameDayJST(item.date, targetDate)) {
          items.push(item);
        }
      } else if (unparsed) {
        if (this.isSameDayJST(unparsed.date, targetDate)) {
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
   * Helper to check if two dates fall on the same calendar day in JST
   */
  private isSameDayJST(date1: Date, date2: Date): boolean {
    // Format to YYYY-MM-DD in Asia/Tokyo
    const d1Str = date1.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const d2Str = date2.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    return d1Str === d2Str;
  }
}
