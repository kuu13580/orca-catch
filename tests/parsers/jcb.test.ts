import { describe, expect, it } from 'vitest';
import { JcbCardParser } from '../../src/parsers/jcb';

describe('JcbCardParser', () => {
  const parser = new JcbCardParser();

  it('canHandle: returns true for JCB notification emails', () => {
    const valid = parser.canHandle({
      id: 'jcb-1',
      subject: '【MyJCB】カードご利用のお知らせ',
      from: 'qa.jcb.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('parse: extracts amount, shop, and Japanese formatted datetime', () => {
    const body = `
いつもJCBカードをご利用いただきありがとうございます。

ご利用日時：2026年9月27日 14:20
ご利用先：セブンイレブン
ご利用金額：780円
`;
    const item = parser.parse({
      id: 'jcb-msg-1',
      subject: '【MyJCB】カードご利用のお知らせ',
      from: 'qa.jcb.co.jp',
      body,
      date: new Date('2026-09-27T14:21:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('jcb');
    expect(item?.cardName).toBe('JCBカード');
    expect(item?.amount).toBe(780);
    expect(item?.shop).toBe('セブンイレブン');
    expect(item?.date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })).toBe('2026/9/27');
  });
});
