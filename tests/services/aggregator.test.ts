import { describe, expect, it } from 'vitest';
import { EmailMessage } from '../../src/config/types';
import { createDefaultRegistry } from '../../src/parsers';
import { EmailFetcher, SpendAggregatorService } from '../../src/services/aggregator';
import { MockExchangeRateProvider } from '../../src/services/currency';

class MockEmailFetcher implements EmailFetcher {
  constructor(private messages: EmailMessage[]) {}

  searchEmails(_query: string): EmailMessage[] {
    return this.messages;
  }
}

describe('SpendAggregatorService', () => {
  it('aggregates multi-card emails, calculates totals and subtotals, and sorts by date descending', () => {
    const mockEmails: EmailMessage[] = [
      {
        id: 'smbc-1',
        subject: '【三井住友カード】ご利用のお知らせ',
        from: 'vpass.ne.jp',
        body: '◇利用日：2026/09/27 10:30\n◇利用先：スーパーA\n◇利用金額：3,000円',
        date: new Date('2026-09-27T01:30:00Z'), // 10:30 JST
      },
      {
        id: 'rakuten-1',
        subject: '【速報版】カード利用のお知らせ',
        from: 'mail.rakuten-card.co.jp',
        body: '■利用日: 2026/09/27\n■利用先: ネットショップB\n■利用金額: 4,500 円',
        date: new Date('2026-09-27T06:00:00Z'), // 15:00 JST
      },
      {
        id: 'smbc-2',
        subject: '【三井住友カード】ご利用のお知らせ',
        from: 'vpass.ne.jp',
        body: '◇利用日：2026/09/27 19:00\n◇利用先：レストランC\n◇利用金額：2,500円',
        date: new Date('2026-09-27T10:00:00Z'), // 19:00 JST
      },
      // Different date (yesterday) - should be excluded
      {
        id: 'smbc-yesterday',
        subject: '【三井住友カード】ご利用のお知らせ',
        from: 'vpass.ne.jp',
        body: '◇利用日：2026/09/26 12:00\n◇利用先：コンビニ\n◇利用金額：500円',
        date: new Date('2026-09-26T03:00:00Z'),
      },
    ];

    const service = new SpendAggregatorService(
      createDefaultRegistry(),
      new MockEmailFetcher(mockEmails)
    );

    const result = service.aggregateForDate('2026-09-27');

    expect(result.targetDate).toBe('2026-09-27');
    // 3,000 + 4,500 + 2,500 = 10,000
    expect(result.totalAmount).toBe(10000);

    // Subtotals
    expect(result.subtotals['smbc']?.amount).toBe(5500);
    expect(result.subtotals['smbc']?.count).toBe(2);
    expect(result.subtotals['rakuten']?.amount).toBe(4500);
    expect(result.subtotals['rakuten']?.count).toBe(1);

    // Items count and sort (newest first)
    expect(result.items).toHaveLength(3);
    expect(result.items[0].shop).toBe('レストランC'); // 19:00
    expect(result.items[1].shop).toBe('ネットショップB'); // 15:00
    expect(result.items[2].shop).toBe('スーパーA'); // 10:30

    expect(result.unparsedEmails).toHaveLength(0);
  });

  it('detects unparsed emails and includes them in result', () => {
    const mockEmails: EmailMessage[] = [
      {
        id: 'broken-smbc',
        subject: '【三井住友カード】ご利用のお知らせ',
        from: 'vpass.ne.jp',
        body: '本文の形式が変更されました。金額の記載がありません。',
        date: new Date('2026-09-27T03:00:00Z'),
      },
    ];

    const service = new SpendAggregatorService(
      createDefaultRegistry(),
      new MockEmailFetcher(mockEmails)
    );

    const result = service.aggregateForDate('2026-09-27');

    expect(result.totalAmount).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.unparsedEmails).toHaveLength(1);
    expect(result.unparsedEmails[0].id).toBe('broken-smbc');
    expect(result.unparsedEmails[0].reason).toContain('三井住友カード');
  });

  it('converts foreign currency items to JPY using exchange rate provider', () => {
    const mockEmails: EmailMessage[] = [
      {
        id: 'smbc-usd',
        subject: 'ご利用のお知らせ【三井住友カード】',
        from: 'vpass.ne.jp',
        body: '◇利用日：2026/10/04 15:30\n◇利用先：AWS EMEA\n◇利用金額：11.51 USD',
        date: new Date('2026-10-04T06:30:00Z'), // 15:30 JST
      },
      {
        id: 'smbc-jpy',
        subject: 'ご利用のお知らせ【三井住友カード】',
        from: 'vpass.ne.jp',
        body: '◇利用日：2026/10/04 10:00\n◇利用先：コンビニ\n◇利用金額：500円',
        date: new Date('2026-10-04T01:00:00Z'), // 10:00 JST
      },
    ];

    const mockRates = new MockExchangeRateProvider({ USD: 150.0 });

    const service = new SpendAggregatorService(
      createDefaultRegistry(),
      new MockEmailFetcher(mockEmails),
      undefined,
      mockRates
    );

    const result = service.aggregateForDate('2026-10-04');

    expect(result.items).toHaveLength(2);
    // 11.51 * 150 = 1726.5 -> round to 1727 JPY
    const usdItem = result.items.find((i) => i.id === 'smbc-usd');
    expect(usdItem?.currency).toBe('USD');
    expect(usdItem?.originalAmount).toBe(11.51);
    expect(usdItem?.rate).toBe(150.0);
    expect(usdItem?.amount).toBe(1727);

    // Total: 1727 + 500 = 2227
    expect(result.totalAmount).toBe(2227);
  });
});

