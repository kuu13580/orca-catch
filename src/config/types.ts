/**
 * Email message data structure for parsing
 */
export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  body: string;
  date: Date;
}

/**
 * Parsed spend record
 */
export interface SpendItem {
  id: string;
  cardId: string;
  cardName: string;
  amount: number;
  shop: string;
  date: Date;
  rawSubject: string;
}

/**
 * Strategy interface for parsing card notification emails
 */
export interface CardParserStrategy {
  readonly id: string;
  readonly cardName: string;

  /**
   * Gmail search query specific to this card (e.g. from:vpass.ne.jp "ご利用のお知らせ")
   */
  getSearchQuery(): string;

  /**
   * Determine whether this strategy can handle the given email
   */
  canHandle(message: EmailMessage): boolean;

  /**
   * Parse email content and return spend item, or null if parsing fails
   */
  parse(message: EmailMessage): SpendItem | null;
}

/**
 * Information about emails that matched search criteria but could not be parsed
 */
export interface UnparsedEmail {
  id: string;
  subject: string;
  from: string;
  date: Date;
  reason: string;
}

/**
 * Aggregated result for a given date
 */
export interface AggregationResult {
  targetDate: string; // YYYY-MM-DD
  totalAmount: number;
  subtotals: Record<
    string,
    {
      cardName: string;
      amount: number;
      count: number;
    }
  >;
  items: SpendItem[];
  unparsedEmails: UnparsedEmail[];
}

/**
 * Application configuration
 */
export interface AppConfig {
  /**
   * Optional Gmail label filter (e.g. 'label:カード通知')
   */
  labelFilter?: string;
}
