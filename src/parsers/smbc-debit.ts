import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { extractDateTime, extractShop, extractSpendAmount } from './base';

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

