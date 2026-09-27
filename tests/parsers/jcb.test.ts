import { describe, expect, it } from 'vitest';
import { JcbCardParser } from '../../src/parsers/jcb';

describe('JcbCardParser', () => {
  const parser = new JcbCardParser();

  it('canHandle: returns true for JCB shopping notification emails', () => {
    const valid = parser.canHandle({
      id: 'jcb-1',
      subject: 'JCBカード／ショッピングご利用のお知らせ',
      from: 'qa.jcb.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('canHandle: returns false for other emails', () => {
    const invalid = parser.canHandle({
      id: 'jcb-2',
      subject: '【MyJCB】キャンペーンのお知らせ',
      from: 'qa.jcb.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(invalid).toBe(false);
  });

  it('parse: handles real-world email format with brackets and Japanese time', () => {
    const body = `
いつもJCBカードをご利用いただきありがとうございます。

【ご利用日時(日本時間)】　2026/04/18 16:09
【ご利用金額】　63,000円
【ご利用先】　リゾートホテルサンプル
`;
    const item = parser.parse({
      id: 'jcb-real-1',
      subject: 'JCBカード／ショッピングご利用のお知らせ',
      from: 'qa.jcb.co.jp',
      body,
      date: new Date('2026-04-18T07:10:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('jcb');
    expect(item?.cardName).toBe('JCBカード');
    expect(item?.amount).toBe(63000);
    expect(item?.shop).toBe('リゾートホテルサンプル');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/4/18');
  });

  it('parse: extracts amount, shop, and Japanese formatted datetime with colons', () => {
    const body = `
いつもJCBカードをご利用いただきありがとうございます。

ご利用日時：2026年9月27日 14:20
ご利用先：セブンイレブン
ご利用金額：780円
`;
    const item = parser.parse({
      id: 'jcb-msg-1',
      subject: 'JCBカード／ショッピングご利用のお知らせ',
      from: 'qa.jcb.co.jp',
      body,
      date: new Date('2026-09-27T14:21:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('jcb');
    expect(item?.amount).toBe(780);
    expect(item?.shop).toBe('セブンイレブン');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/9/27');
  });
});

