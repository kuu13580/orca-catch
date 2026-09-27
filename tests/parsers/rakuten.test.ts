import { describe, expect, it } from 'vitest';
import { RakutenCardParser } from '../../src/parsers/rakuten';

describe('RakutenCardParser', () => {
  const parser = new RakutenCardParser();

  it('canHandle: returns true for Rakuten Card prompt emails', () => {
    const valid = parser.canHandle({
      id: 'rakuten-1',
      subject: '【速報版】カード利用のお知らせ(本人ご利用分)',
      from: 'mail.rakuten-card.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('canHandle: returns false for unrelated Rakuten emails', () => {
    const invalid = parser.canHandle({
      id: 'rakuten-2',
      subject: '楽天カードニュース',
      from: 'mail.rakuten-card.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(invalid).toBe(false);
  });

  it('parse: handles real-world plain body format with ■ markers', () => {
    const body = `
楽天カードをご利用いただきありがとうございます。

■利用日: 2026/09/13
■利用先: サンプルショップ
■利用者: 本人
■支払方法: 1回
■利用金額: 2,990 円
■支払月: 2026/10
`;
    const item = parser.parse({
      id: 'rakuten-real-1',
      subject: '【速報版】カード利用のお知らせ(本人ご利用分)',
      from: 'mail.rakuten-card.co.jp',
      body,
      date: new Date('2026-09-13T12:00:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('rakuten');
    expect(item?.cardName).toBe('楽天カード');
    expect(item?.amount).toBe(2990);
    expect(item?.shop).toBe('サンプルショップ');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/9/13');
  });
});
