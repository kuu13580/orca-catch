import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractAmount, extractDateTime, extractShop } from './base';

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
    const amount = extractAmount(message.body);
    if (!amount) return null;

    const shop = extractShop(message.body);
    const date = extractDateTime(message.body, message.date);

    return {
      id: message.id,
      cardId: this.id,
      cardName: this.cardName,
      amount,
      shop,
      date,
      rawSubject: message.subject,
    };
  }
}
