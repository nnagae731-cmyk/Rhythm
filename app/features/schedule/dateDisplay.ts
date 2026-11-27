/** Display only: never use this label as a storage key or for date arithmetic. */
export function formatJapaneseDateKey(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : key;
}
