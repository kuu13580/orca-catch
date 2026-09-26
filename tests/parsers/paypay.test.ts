import { describe, expect, it } from 'vitest';
import { PayPayCardParser } from '../../src/parsers/paypay';

describe('PayPayCardParser', () => {
  const parser = new PayPayCardParser();

  it('canHandle: returns true for PayPay card prompt emails', () => {
    const valid = parser.canHandle({
      id: 'paypay-1',
      subject: 'カードご利用速報のお知らせ',
      from: 'mail.paypay-card.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('parse: extracts amount, shop, and date correctly', () => {
    const body = `
いつもPayPayカードをご利用いただきありがとうございます。

利用日時：2026/09/27 19:45
利用先：ウエルシア薬局
利用金額：2,180円
`;
    const item = parser.parse({
      id: 'paypay-msg-1',
      subject: 'カードご利用速報のお知らせ',
      from: 'mail.paypay-card.co.jp',
      body,
      date: new Date('2026-09-27T19:46:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('paypay');
    expect(item?.cardName).toBe('PayPayカード');
    expect(item?.amount).toBe(2180);
    expect(item?.shop).toBe('ウエルシア薬局');
    expect(item?.date.getFullYear()).toBe(2026);
    expect(item?.date.getMonth()).toBe(8);
    expect(item?.date.getDate()).toBe(27);
  });
});
