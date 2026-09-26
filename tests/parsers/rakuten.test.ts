import { describe, expect, it } from 'vitest';
import { RakutenCardParser } from '../../src/parsers/rakuten';

describe('RakutenCardParser', () => {
  const parser = new RakutenCardParser();

  it('canHandle: returns true for Rakuten Card prompt emails', () => {
    const valid = parser.canHandle({
      id: 'rakuten-1',
      subject: '【速報版】カード利用のお知らせ(受付情報)',
      from: 'mail.rakuten-card.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('parse: extracts amount, shop, and date correctly', () => {
    const body = `
楽天カードをご利用いただきありがとうございます。

■利用日: 2026/09/27
■利用先: ＶＩＳＡ国内加盟店
■利用者: 本人
■利用金額: 3,450 円
■支払方法: 1回払い
`;
    const item = parser.parse({
      id: 'rakuten-msg-1',
      subject: '【速報版】カード利用のお知らせ(受付情報)',
      from: 'mail.rakuten-card.co.jp',
      body,
      date: new Date('2026-09-27T18:00:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('rakuten');
    expect(item?.amount).toBe(3450);
    expect(item?.shop).toBe('ＶＩＳＡ国内加盟店');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/9/27');
  });
});
