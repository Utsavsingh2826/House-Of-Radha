import { describe, expect, it } from 'vitest';
import { extractSkuFromBasename, isScannableImageEntry } from './catalog.js';

describe('extractSkuFromBasename', () => {
  it('parses standard SKU filenames', () => {
    expect(extractSkuFromBasename('BC-BN-001.png')).toBe('BC-BN-001');
    expect(extractSkuFromBasename('ER-PO-12(1).png')).toBe('ER-PO-12');
    expect(extractSkuFromBasename('BG-OX-26_2.png')).toBe('BG-OX-26');
  });

  it('parses extension-less brooch variants', () => {
    expect(extractSkuFromBasename('BO-WS-02.1')).toBe('BO-WS-02');
  });

  it('returns null for design-code files', () => {
    expect(extractSkuFromBasename('D31.1.png')).toBeNull();
  });
});

describe('isScannableImageEntry', () => {
  it('accepts SKU-like extension-less names', () => {
    expect(isScannableImageEntry('BO-WS-02.1')).toBe(true);
  });
});
