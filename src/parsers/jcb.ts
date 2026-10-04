import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractDateTime, extractShop, extractSpendAmount } from './base';

export class JcbCardParser implements CardParserStrategy {
  readonly id = 'jcb';
  readonly cardName = 'JCBカード';

  getSearchQuery(): string {
    return 'from:jcb.co.jp "ショッピングご利用のお知らせ"';
  }

  canHandle(message: EmailMessage): boolean {
    return (
      message.from.toLowerCase().includes('jcb.co.jp') &&
      message.subject.includes('ショッピングご利用のお知らせ')
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

