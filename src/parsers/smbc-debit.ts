import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractAmount, extractDateTime, extractShop } from './base';

export class SmbcDebitCardParser implements CardParserStrategy {
  readonly id = 'smbc-debit';
  readonly cardName = '三井住友カード (デビット/iD)';

  getSearchQuery(): string {
    return 'from:smbc-debit@smbc-card.com "ご利用のお知らせ"';
  }

  canHandle(message: EmailMessage): boolean {
    return (
      message.from.toLowerCase().includes('smbc-debit@smbc-card.com') &&
      message.subject.includes('ご利用のお知らせ')
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
