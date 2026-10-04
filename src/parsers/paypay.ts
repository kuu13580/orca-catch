import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractDateTime, extractShop, extractSpendAmount } from './base';

export class PayPayCardParser implements CardParserStrategy {
  readonly id = 'paypay';
  readonly cardName = 'PayPayカード';

  getSearchQuery(): string {
    return 'from:paypay-card.co.jp "カードご利用速報のお知らせ"';
  }

  canHandle(message: EmailMessage): boolean {
    return (
      message.from.toLowerCase().includes('paypay-card.co.jp') &&
      message.subject.includes('カードご利用速報のお知らせ')
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

