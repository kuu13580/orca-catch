# orca-catch コントリビューションガイド 🐋⚡

`orca-catch` へのコントリビューションを検討していただきありがとうございます！
新しいクレジットカード・決済サービスへの対応や、各社のメールフォーマット変更への追従など、Pull Request (PR) を大歓迎しています。

---

## 新規カードパーサーの追加手順（3ステップ）

新しいカードに対応させる作業は、**以下の3ステップで完了**します。

### ステップ 1: パーサークラスを作成する (`src/parsers/`)

`src/parsers/` 配下に新しいファイル（例: `src/parsers/epos.ts`）を作成し、`CardParserStrategy` インターフェースを実装します。

```typescript
import { CardParserStrategy, EmailMessage, SpendItem } from '../config/types';
import { cleanShopName, parseAmount, parseDateTime } from './base';

export class EposCardParser implements CardParserStrategy {
  readonly id = 'epos';
  readonly cardName = 'エポスカード';

  /**
   * Gmail検索クエリ
   * 送信元アドレスや件名など、対象メールに一意な条件を指定します。
   */
  getSearchQuery(): string {
    return 'from:eposcard.co.jp "カード利用のお知らせ"';
  }

  /**
   * 受信したメールがこのカードのものかを判定
   */
  canHandle(message: EmailMessage): boolean {
    return (
      message.from.toLowerCase().includes('eposcard.co.jp') &&
      message.subject.includes('カード利用のお知らせ')
    );
  }

  /**
   * メール本文から金額・店舗名・日時を抽出
   */
  parse(message: EmailMessage): SpendItem | null {
    // 金額抽出 (例: 利用金額：1,234円)
    const amountMatch = message.body.match(/(?:利用金額|ご利用金額)[：:\s]+([0-9,０-９，]+)\s*円/);
    if (!amountMatch) return null;

    const amount = parseAmount(amountMatch[1]);
    if (!amount) return null;

    // 店舗名抽出
    const shopMatch = message.body.match(/(?:利用場所|利用先|ご利用先)[：:\s]+([^\r\n]+)/);
    const shop = cleanShopName(shopMatch ? shopMatch[1] : undefined);

    // 利用日時抽出
    const dateMatch = message.body.match(/(?:利用日時|利用日)[：:\s]+([^\r\n]+)/);
    const date = parseDateTime(dateMatch ? dateMatch[1] : undefined, message.date);

    return {
      id: message.id,
      cardId: this.id,
      cardName: this.cardName,
      amount,
      shop,
      date,
      rawSubject: message.subject,
    };
  }
}
```

### ステップ 2: 単体テストを作成する (`tests/parsers/`)

`tests/parsers/` 配下にテストファイル（例: `tests/parsers/epos.test.ts`）を作成し、メール本文サンプルでパースできることを検証します。
※**サンプル本文内に実際のカード番号や個人名を含めないようご注意ください。**

```typescript
import { describe, expect, it } from 'vitest';
import { EposCardParser } from '../../src/parsers/epos';

describe('EposCardParser', () => {
  const parser = new EposCardParser();

  it('canHandle: returns true for Epos notification email', () => {
    const valid = parser.canHandle({
      id: 'epos-1',
      subject: '【エポスカード】カード利用のお知らせ',
      from: 'info@eposcard.co.jp',
      body: '...',
      date: new Date('2026-09-27T10:00:00Z'),
    });
    expect(valid).toBe(true);
  });

  it('parse: extracts amount, shop, and date correctly', () => {
    const body = `
エポスカードをご利用いただきありがとうございます。

■利用日時：2026/09/27 12:34
■利用場所：スターバックス
■利用金額：650円
`;
    const item = parser.parse({
      id: 'epos-msg-1',
      subject: '【エポスカード】カード利用のお知らせ',
      from: 'info@eposcard.co.jp',
      body,
      date: new Date('2026-09-27T12:35:00Z'),
    });

    expect(item).not.toBeNull();
    expect(item?.amount).toBe(650);
    expect(item?.shop).toBe('スターバックス');
  });
});
```

### ステップ 3: レジストリに登録する (`src/parsers/index.ts`)

`src/parsers/index.ts` で作成したパーサーをエクスポートし、`createDefaultRegistry` 関数内の配列に追加します。

```typescript
export function createDefaultRegistry(): ParserRegistry {
  return new ParserRegistry([
    new SmbcCardParser(),
    new RakutenCardParser(),
    new JcbCardParser(),
    new PayPayCardParser(),
    new EposCardParser(), // ← 追加
  ]);
}
```

---

## 動作確認・検証コマンド

PR作成前に以下のコマンドがすべて成功することをご確認ください。

```bash
npm run typecheck # 型チェック
npm test          # 単体テスト (Vitest)
npm run build     # esbuild バンドルビルド
```
