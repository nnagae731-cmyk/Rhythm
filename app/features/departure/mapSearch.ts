import { Alert, Linking, Platform } from 'react-native';
import type { DeparturePlan } from '../../types';

export function getMapSearchTarget(plan: DeparturePlan) {
  return (plan.destination?.trim() || plan.title || '').trim();
}

export function buildMapSearchUrl(query: string) {
  const encoded = encodeURIComponent(query.trim());
  if (!encoded) return undefined;
  if (Platform.OS === 'ios') return `maps://?q=${encoded}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export async function openMapSearch(query: string) {
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
  const primaryUrl = buildMapSearchUrl(query);
  if (!primaryUrl) {
    Alert.alert('目的地を入れてね', '地図を開くには目的地が必要です。');
    return;
  }
  try {
    await Linking.openURL(primaryUrl);
  } catch {
    try {
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert('地図を開けませんでした', '目的地の入力を確認してもう一度試してね。');
    }
  }
}
