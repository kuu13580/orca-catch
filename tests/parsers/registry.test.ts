import { describe, expect, it } from 'vitest';
import { createDefaultRegistry } from '../../src/parsers';
import { ParserRegistry } from '../../src/parsers/registry';
import { SmbcCardParser } from '../../src/parsers/smbc';

describe('ParserRegistry', () => {
  it('buildCombinedSearchQuery: builds correct Gmail search query with OR and exclusions', () => {
    const registry = createDefaultRegistry();
    const query = registry.buildCombinedSearchQuery({
      afterDateStr: '2026/09/27',
      beforeDateStr: '2026/09/28',
      labelFilter: 'label:カード通知',
    });

    expect(query).toContain('from:vpass.ne.jp');
    expect(query).toContain('from:mail.rakuten-card.co.jp');
    expect(query).toContain('from:jcb.co.jp');
    expect(query).toContain('from:paypay-card.co.jp');
    expect(query).toContain('after:2026/09/27');
    expect(query).toContain('before:2026/09/28');
    expect(query).toContain('-in:trash');
    expect(query).toContain('-in:spam');
    expect(query).toContain('label:カード通知');
  });

  it('dispatch: parses email matching registered strategy', () => {
    const registry = createDefaultRegistry();
    const result = registry.dispatch({
      id: 'msg-smbc',
      subject: '【三井住友カード】ご利用のお知らせ',
      from: 'mail.vpass.ne.jp',
      body: '◇利用金額：1,000円\n◇利用先：テスト店舗\n◇利用日：2026/09/27 10:00',
      date: new Date('2026-09-27T10:00:00Z'),
    });

    expect(result.item).toBeDefined();
    expect(result.item?.amount).toBe(1000);
    expect(result.item?.cardId).toBe('smbc');
    expect(result.unparsed).toBeUndefined();
  });

  it('dispatch: detects unparsed email when body format does not match', () => {
    const registry = new ParserRegistry([new SmbcCardParser()]);
    // Email matches SMBC headers, but amount format is corrupted
    const result = registry.dispatch({
      id: 'corrupted-smbc-msg',
      subject: '【三井住友カード】ご利用のお知らせ',
      from: 'vpass.ne.jp',
      body: 'カードのご利用がありました。詳細はWebで確認してください。',
      date: new Date('2026-09-27T10:00:00Z'),
    });

    expect(result.item).toBeUndefined();
    expect(result.unparsed).toBeDefined();
    expect(result.unparsed?.id).toBe('corrupted-smbc-msg');
    expect(result.unparsed?.reason).toContain('三井住友カード');
  });

  it('dispatch: returns empty object for completely unrelated email', () => {
    const registry = createDefaultRegistry();
    const result = registry.dispatch({
      id: 'unrelated-msg',
      subject: 'メールマガジン',
      from: 'newsletter@news.com',
      body: '本日のニュースです',
      date: new Date('2026-09-27T10:00:00Z'),
    });

    expect(result.item).toBeUndefined();
    expect(result.unparsed).toBeUndefined();
  });
});
