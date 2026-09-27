import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractAmount, extractDateTime, extractShop } from './base';

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
