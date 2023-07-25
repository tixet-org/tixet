export const hexToUtf8 = (hex: string) => Buffer.from(hex.replace(/^0x/, ''), 'hex').toString('utf8');

export const utf8ToHex = (utf8: string) => '0x' + Buffer.from(utf8, 'utf8').toString('hex');

export const hexToBytes = (hex: string) => Buffer.from(hex.replace(/^0x/, ''), 'hex');

export const hexToByteArray = (hexString: string): Uint8Array => Uint8Array.from(hexToBytes(hexString));
