import { describe, expect, it } from 'vitest';
import { SmbcDebitCardParser } from '../../src/parsers/smbc-debit';

describe('SmbcDebitCardParser', () => {
  const parser = new SmbcDebitCardParser();

  it('canHandle: returns true for SMBC debit notification email', () => {
    const valid = parser.canHandle({
      id: 'debit-1',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'smbc-debit@smbc-card.com',
      body: '...',
      date: new Date('2026-09-14T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('canHandle: returns false for SMBC credit (vpass) emails', () => {
    const invalid = parser.canHandle({
      id: 'debit-2',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'mail.vpass.ne.jp',
      body: '...',
      date: new Date('2026-09-14T10:00:00Z'),
    });
    expect(invalid).toBe(false);
  });

  it('parse: handles real-world debit/iD format with irregular spacing', () => {
    const body = `
三井住友カードをご利用いただきありがとうございます。

◇利用日  ：2026/09/14 19:27:12
◇利用先　：iDデビット
◇利用金額：170円
`;
    const item = parser.parse({
      id: 'debit-msg-1',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'smbc-debit@smbc-card.com',
      body,
      date: new Date('2026-09-14T10:28:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('smbc-debit');
    expect(item?.cardName).toBe('三井住友カード (デビット/iD)');
    expect(item?.amount).toBe(170);
    expect(item?.shop).toBe('iDデビット');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/9/14');
  });
});
