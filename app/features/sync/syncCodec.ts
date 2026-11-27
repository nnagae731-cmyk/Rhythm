import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

export function utf8Bytes(value: string): Uint8Array {
  const bytes = new Uint8Array(utf8ByteLength(value));
  let offset = 0;
  for (let index = 0; index < value.length; index += 1) {
    let code = value.codePointAt(index)!;
    if (code > 0xFFFF) index += 1;
    if (code >= 0xD800 && code <= 0xDFFF) code = 0xFFFD;
    if (code < 0x80) bytes[offset++] = code;
    else if (code < 0x800) { bytes[offset++] = 0xC0 | code >> 6; bytes[offset++] = 0x80 | code & 0x3F; }
    else if (code < 0x10000) { bytes[offset++] = 0xE0 | code >> 12; bytes[offset++] = 0x80 | code >> 6 & 0x3F; bytes[offset++] = 0x80 | code & 0x3F; }
    else { bytes[offset++] = 0xF0 | code >> 18; bytes[offset++] = 0x80 | code >> 12 & 0x3F; bytes[offset++] = 0x80 | code >> 6 & 0x3F; bytes[offset++] = 0x80 | code & 0x3F; }
  }
  return bytes;
}
export function syncBodyHash(body: string): string { return bytesToHex(sha256(utf8Bytes(body))); }
export function utf8ByteLength(value: string): number {
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) length += 1;
    else if (code < 0x800) length += 2;
    else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xDC00 && value.charCodeAt(index + 1) <= 0xDFFF) { length += 4; index += 1; }
    else length += 3;
  }
  return length;
}
export const ICLOUD_MAX_BODY_BYTES = 900_000;
