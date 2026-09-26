import { describe, expect, it } from 'vitest';
import { SmbcCardParser } from '../../src/parsers/smbc';

describe('SmbcCardParser', () => {
  const parser = new SmbcCardParser();

  it('canHandle: returns true for valid SMBC notification email', () => {
    const valid = parser.canHandle({
      id: 'msg-1',
      subject: '【三井住友カード】ご利用のお知らせ',
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

  it('parse: extracts amount, shop, and datetime correctly', () => {
    const body = `
いつも三井住友カードをご利用いただきありがとうございます。

◇利用日：2026/09/27 12:34
◇利用先：セブン-イレブン
◇利用金額：1,540円

※本メールは決済完了時に送信されます。
`;
    const item = parser.parse({
      id: 'smbc-msg-1',
      subject: '【三井住友カード】ご利用のお知らせ',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-09-27T12:35:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.cardId).toBe('smbc');
    expect(item?.cardName).toBe('三井住友カード');
    expect(item?.amount).toBe(1540);
    expect(item?.shop).toBe('セブン-イレブン');
    expect(item?.date.getFullYear()).toBe(2026);
    expect(item?.date.getMonth()).toBe(8); // September is 8 (0-indexed)
    expect(item?.date.getDate()).toBe(27);
  });

  it('parse: handles full-width numbers and commas', () => {
    const body = `
◇利用日：2026/09/27
◇利用先：スターバックスコーヒー
◇利用金額：２，５００円
`;
    const item = parser.parse({
      id: 'smbc-msg-2',
      subject: '【三井住友カード】ご利用のお知らせ',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-09-27T15:00:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.amount).toBe(2500);
    expect(item?.shop).toBe('スターバックスコーヒー');
  });

  it('parse: returns null when amount is missing', () => {
    const body = `
重要なお知らせ
規約の改定についてご案内いたします。
`;
    const item = parser.parse({
      id: 'smbc-msg-3',
      subject: '【三井住友カード】ご利用のお知らせ',
      from: 'vpass.ne.jp',
      body,
      date: new Date('2026-09-27T10:00:00Z'),
    });

    expect(item).toBeNull();
  });
});
