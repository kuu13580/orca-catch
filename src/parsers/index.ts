import { JcbCardParser } from './jcb';
import { PayPayCardParser } from './paypay';
import { RakutenCardParser } from './rakuten';
import { ParserRegistry } from './registry';
import { SmbcCardParser } from './smbc';

export * from './base';
export * from './jcb';
export * from './paypay';
export * from './rakuten';
export * from './registry';
export * from './smbc';

/**
 * Create default registry pre-loaded with standard 4-card strategies
 */
export function createDefaultRegistry(): ParserRegistry {
  return new ParserRegistry([
    new SmbcCardParser(),
    new RakutenCardParser(),
    new JcbCardParser(),
    new PayPayCardParser(),
  ]);
}
