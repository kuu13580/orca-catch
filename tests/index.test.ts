import { describe, expect, it } from 'vitest';
import { formatJapaneseDate, getTodayJST } from '../src';

describe('src/index utility functions', () => {
  it('getTodayJST returns a string in YYYY-MM-DD format', () => {
    const today = getTodayJST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatJapaneseDate formats date correctly with day of week', () => {
    const formatted = formatJapaneseDate('2026-09-27');
    expect(formatted).toBe('2026年9月27日 (日)');
  });
});
