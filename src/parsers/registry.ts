import { CardParserStrategy, EmailMessage, SpendItem, UnparsedEmail } from '../config/types';

export class ParserRegistry {
  private strategies: CardParserStrategy[] = [];

  constructor(strategies: CardParserStrategy[] = []) {
    this.strategies = [...strategies];
  }

  register(strategy: CardParserStrategy): void {
    this.strategies.push(strategy);
  }

  getStrategies(): readonly CardParserStrategy[] {
    return this.strategies;
  }

  /**
   * Build an optimized Gmail search query combining all card strategies with date range and exclusions
   */
  buildCombinedSearchQuery(params: {
    afterDateStr: string; // YYYY/MM/DD
    beforeDateStr: string; // YYYY/MM/DD
    labelFilter?: string;
  }): string {
    if (this.strategies.length === 0) {
      return '';
    }

    const cardQueries = this.strategies.map((s) => `(${s.getSearchQuery()})`).join(' OR ');
    const parts: string[] = [
      `{${cardQueries}}`,
      `after:${params.afterDateStr}`,
      `before:${params.beforeDateStr}`,
      '-in:trash',
      '-in:spam',
    ];

    if (params.labelFilter) {
      parts.push(params.labelFilter);
    }

    return parts.join(' ');
  }

  /**
   * Dispatch email message to matching strategy and parse
   */
  dispatch(message: EmailMessage): { item?: SpendItem; unparsed?: UnparsedEmail } {
    const matchedStrategy = this.strategies.find((strategy) => strategy.canHandle(message));

    if (!matchedStrategy) {
      // Not targeted by any registered card parser
      return {};
    }

    const parsedItem = matchedStrategy.parse(message);
    if (!parsedItem) {
      return {
        unparsed: {
          id: message.id,
          subject: message.subject,
          from: message.from,
          date: message.date,
          reason: `${matchedStrategy.cardName}: 金額パターンに合致しませんでした`,
        },
      };
    }

    return { item: parsedItem };
  }
}
