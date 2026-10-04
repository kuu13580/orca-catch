import { describe, expect, it } from 'vitest';
import { SmbcCardParser } from '../../src/parsers/smbc';

describe('SmbcCardParser', () => {
  const parser = new SmbcCardParser();

  it('canHandle: returns true for valid SMBC notification email', () => {
    const valid = parser.canHandle({
      id: 'msg-1',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'mail.vpass.ne.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('canHandle: returns false for other emails', () => {
    const invalid = parser.canHandle({
      id: 'msg-2',
      subject: '楽天カードからのお知らせ',
      from: 'info@other.com',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(invalid).toBe(false);
  });

  it('parse: handles real-world format with ◇ markers', () => {
    const body = `
いつも三井住友カードをご利用いただきありがとうございます。

◇利用日：2026/09/27 09:17
◇利用先：サンプルストア
◇利用取引：買物
◇利用金額：150円
`;
    const item = parser.parse({
      id: 'smbc-real-1',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-09-27T00:18:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('smbc');
    expect(item?.cardName).toBe('三井住友カード');
    expect(item?.amount).toBe(150);
    expect(item?.shop).toBe('サンプルストア');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/9/27');
  });

  it('parse: handles full-width numbers and commas', () => {
    const body = `
◇利用日：2026/09/27
◇利用先：サンプルカフェ
◇利用金額：２，５００円
`;
    const item = parser.parse({
      id: 'smbc-msg-2',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-09-27T15:00:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.amount).toBe(2500);
    expect(item?.shop).toBe('サンプルカフェ');
  });

  it('parse: handles JPY currency and decimal amounts', () => {
    const body = `
◇利用日：2026/10/02 04:57
◇利用先：X CORP ADVERTISING
◇利用取引：買物
◇利用金額：1,520.00JPY
`;
    const item = parser.parse({
      id: 'smbc-msg-jpy',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-10-01T19:58:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.amount).toBe(1520);
    expect(item?.shop).toBe('X CORP ADVERTISING');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/10/2');
  });

  it('parse: handles USD foreign currency amounts', () => {
    const body = `
◇利用日：2026/10/04 15:30
◇利用先：AWS EMEA
◇利用取引：買物
◇利用金額：11.51 USD
`;
    const item = parser.parse({
      id: 'smbc-msg-usd',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-10-04T06:30:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.originalAmount).toBe(11.51);
    expect(item?.currency).toBe('USD');
    expect(item?.shop).toBe('AWS EMEA');
  });

  it('parse: returns null when amount is missing', () => {
    const body = `
重要なお知らせ
規約の改定についてご案内いたします。
`;
    const item = parser.parse({
      id: 'smbc-msg-3',
      subject: 'ご利用のお知らせ【三井住友カード】',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-09-27T10:00:00Z'),
    });

    expect(item).toBeNull();
  });
});
