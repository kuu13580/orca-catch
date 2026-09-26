import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { cleanShopName, parseAmount, parseDateTime } from './base';

export class JcbCardParser implements CardParserStrategy {
  readonly id = 'jcb';
  readonly cardName = 'JCBカード';

  getSearchQuery(): string {
    return 'from:jcb.co.jp "カードご利用のお知らせ"';
  }

  canHandle(message: EmailMessage): boolean {
    return (
      message.from.toLowerCase().includes('jcb.co.jp') &&
      message.subject.includes('カードご利用のお知らせ')
    );
  }

  parse(message: EmailMessage): SpendItem | null {
    // Extract amount
    const amountMatch = message.body.match(/(?:ご利用金額|利用金額)[：:\s]+([0-9,０-９，]+)\s*円/);
    if (!amountMatch) return null;

    const amount = parseAmount(amountMatch[1]);
    if (!amount) return null;

    // Extract shop name
    const shopMatch = message.body.match(/(?:ご利用先|利用先)[：:\s]+([^\r\n]+)/);
    const shop = cleanShopName(shopMatch ? shopMatch[1] : undefined);

    // Extract date
    const dateMatch = message.body.match(/(?:ご利用日時|利用日時|ご利用日)[：:\s]+([^\r\n]+)/);
    const date = parseDateTime(dateMatch ? dateMatch[1] : undefined, message.date);

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
