import { JcbCardParser } from './jcb';
import { PayPayCardParser } from './paypay';
import { RakutenCardParser } from './rakuten';
import { ParserRegistry } from './registry';
import { SmbcCardParser } from './smbc';
import { SmbcDebitCardParser } from './smbc-debit';

export * from './base';
export * from './jcb';
export * from './paypay';
export * from './rakuten';
export * from './registry';
export * from './smbc';
export * from './smbc-debit';

/**
 * Create default registry pre-loaded with standard card strategies
 */
export function createDefaultRegistry(): ParserRegistry {
  return new ParserRegistry([
    new SmbcCardParser(),
    new SmbcDebitCardParser(),
    new RakutenCardParser(),
    new JcbCardParser(),
    new PayPayCardParser(),
  ]);
}
