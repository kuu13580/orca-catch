import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractDateTime, extractShop, extractSpendAmount } from './base';

export class RakutenCardParser implements CardParserStrategy {
  readonly id = 'rakuten';
  readonly cardName = '楽天カード';

  getSearchQuery(): string {
    return 'from:mail.rakuten-card.co.jp "カード利用のお知らせ"';
  }

  canHandle(message: EmailMessage): boolean {
    return (
      message.from.toLowerCase().includes('mail.rakuten-card.co.jp') &&
      message.subject.includes('カード利用のお知らせ')
    );
  }

  parse(message: EmailMessage): SpendItem | null {
    const parsedAmount = extractSpendAmount(message.body);
    if (!parsedAmount) return null;

    const shop = extractShop(message.body);
    const date = extractDateTime(message.body, message.date);

    return {
      id: message.id,
      cardId: this.id,
      cardName: this.cardName,
      amount: parsedAmount.amount,
      originalAmount: parsedAmount.currency !== 'JPY' ? parsedAmount.amount : undefined,
      currency: parsedAmount.currency,
      shop,
      date,
      rawSubject: message.subject,
    };
  }
}

