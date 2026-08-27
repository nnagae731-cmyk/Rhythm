import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode } from '../theme';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PlanTier } from '../premiumAccess';

type PremiumPreviewKind = PremiumGuideFeatureId;

export type PremiumStoreProduct = {
  displayPrice: string;
  periodLabel: string;
  /** Numeric localized price, when provided by StoreKit, for savings math. */
  amount?: number;
};

export type PremiumStoreProducts = {
  monthly?: PremiumStoreProduct;
  annual?: PremiumStoreProduct;
};
export type PremiumStoreProductStatus = 'loading' | 'ready' | 'unavailable';

const darkPreviewStyleOverrides: Record<string, any> = {
  premiumPreview: { backgroundColor: '#181F2E', borderColor: '#40506A' },
  previewImageLabel: { color: '#8F9BB0' },
  previewScheduleRow: { borderBottomColor: '#303B50' },
  previewTime: { color: '#F4F7FC' },
  previewScheduleTitle: { color: '#F4F7FC' },
  previewSource: { color: '#F4F7FC', backgroundColor: '#26365F' },
  previewSourceRhythm: { color: '#F4F7FC', backgroundColor: '#26365F' },
  previewFlowText: { color: '#B4C0D4' },
  previewArrow: { color: '#8F9BB0' },
  previewFlowButton: { color: '#101522', backgroundColor: '#8EA6FF' },
  previewRouteMap: { backgroundColor: '#20293A', borderColor: '#40506A' },
  previewRouteMapTitle: { color: '#8EA6FF' },
  previewRouteMapPlace: { color: '#F4F7FC' },
  previewRouteCopy: { color: '#B4C0D4' },
  previewNotification: { backgroundColor: '#20293A', borderColor: '#40506A' },
  previewNotificationTime: { color: '#F4F7FC' },
  previewNotificationTitle: { color: '#F4F7FC' },
  previewNotificationCopy: { color: '#B4C0D4' },
  previewMetricLabel: { color: '#B4C0D4' },
  previewCompareLabel: { color: '#8F9BB0' },
  previewCompareValue: { color: '#F4F7FC' },
  previewCompareArrow: { color: '#8F9BB0' },
  previewMetricBig: { color: '#8EA6FF' },
  previewRecordCount: { color: '#B4C0D4' },
  previewInsightRow: { borderTopColor: '#303B50' },
  previewInsightLabel: { color: '#B4C0D4' },
  previewInsightValue: { color: '#F4F7FC' },
  previewCompareTag: { color: '#B4C0D4' },
  previewWeekDay: { color: '#F4F7FC', borderColor: '#40506A' },
  previewMonth: { backgroundColor: '#20293A' },
  previewMonthTitle: { color: '#F4F7FC' },
  previewMonthWeek: { color: '#B4C0D4' },
  previewMonthDays: { color: '#F4F7FC' },
  previewTemplateSource: { borderColor: '#40506A' },
  previewTemplateTitle: { color: '#F4F7FC' },
  previewTemplateMeta: { color: '#B4C0D4' },
  previewTemplateSave: { color: '#101522', backgroundColor: '#8EA6FF' },
  previewTemplateSaved: { backgroundColor: '#20293A' },
  previewTemplateChoose: { color: '#8EA6FF' },
  previewTemplateReady: { color: '#B4C0D4' },
  previewDanger: { backgroundColor: '#4A2835' },
  previewDangerText: { color: '#FF8F9C' },
  previewRecoveryOption: { backgroundColor: '#20293A' },
  previewRecoveryText: { color: '#B4C0D4' },
};

const PREMIUM_GUIDE_FEATURES: Array<{ id: PremiumGuideFeatureId; kind: PremiumPreviewKind; title: string; description: string }> = [
  { id: 'focus_custom_duration', kind: 'focus_custom_duration', title: '集中時間を自由に設定', description: '決まった時間だけでなく、その日に合わせて好きな集中時間を設定できます。' },
  { id: 'records', kind: 'records', title: '今日の記録', description: '写真・ひとこと・メモを日付ごとに保存。カレンダーから記録済みの日を確認し、登録後の編集・削除もできます。' },
  { id: 'reflection', kind: 'reflection', title: '今月を振り返る', description: 'カレンダー上部のボタンから開く独立機能。今月の写真・言葉・ベストをテンプレートやレイアウトでまとめ、画像保存・共有できます。' },
  { id: 'calendar', kind: 'calendar', title: 'カレンダー連携', description: '予定の閲覧は無料。Freeは広告1回で1予定をRhythmへ取り込め、Premiumなら広告なしで取り込めます。' },
  { id: 'route', kind: 'route', title: '地図・共有', description: '予定の場所を地図で確認し、予定内容をPremiumの共有機能で届けられます。' },
  { id: 'travel_apps', kind: 'travel_apps', title: '移動アプリ連携', description: 'いつもの乗換・タクシーアプリを登録して、予定や遅れた時にRhythmからすぐ開けます。' },
  { id: 'nudge', kind: 'nudge', title: '高度な通知', description: '段階的な通知や反応に応じた再通知で、大切な予定を忘れにくくします。' },
  { id: 'time', kind: 'time', title: '行動分析', description: '通知・準備・出発・集中など、実際の行動記録から自分の傾向を振り返れます。' },
  { id: 'behavior', kind: 'behavior', title: '行動の振り返り', description: '最近の反応や集中の記録を、責めない言葉で確認できます。' },
  { id: 'month', kind: 'month', title: '月表示と詳細履歴', description: '7日を超えた予定や過去の完了・集中・出発記録を、月単位で確認できます。' },
  { id: 'history', kind: 'history', title: '詳細な履歴・検索', description: '過去の完了タスクや記録を、検索とカレンダーから詳しく確認できます。' },
  { id: 'recovery', kind: 'recovery', title: '遅れた時の立て直し', description: '今からできる行動を選んで、崩れた予定を立て直せます。' },
  { id: 'templates', kind: 'templates', title: 'タスクひな型', description: '一度作ったタスクのカテゴリ・優先度・通知設定をひな型として保存し、次回の登録を簡単にします。' },
  { id: 'wish', kind: 'wish', title: '叶えるための行動', description: '叶えたいことはFreeでも記録できます。Premiumなら「叶えるための行動」に分けて管理し、今月の進捗まで確認できます。' },
  { id: 'affirmation', kind: 'affirmation', title: '好きな言葉を、選んだ時間に届ける', description: '自分で書いたアファメーションを毎日指定時刻に通知。忙しい日も、自分の軸へ静かに戻れます。' },
  { id: 'photo_design', kind: 'photo_design', title: '選べるデザイン', description: '花柄1〜3、ドット、チェックデザイン、写真背景はPremiumで利用できます。FreeでもTrialや広告で試せます。Design Customizeを¥500で買い切れば、Premiumなしでも広告なしでずっと利用できます。' },
];

const PREMIUM_FEATURE_ICONS: Record<PremiumGuideFeatureId, string> = {
  focus_custom_duration: '◷', records: '▤', reflection: '◌', calendar: '▦', route: '↗', travel_apps: '⌁',
  nudge: '◒', time: '◴', behavior: '◍', month: '▦', history: '⌕', recovery: '↺', templates: '▧', wish: '♡',
  affirmation: '✦', photo_design: '✧', floral: '✿', dot: '⁙', check: '▦',
};

const PREMIUM_FEATURE_DIFFS: Partial<Record<PremiumGuideFeatureId, { free: string; premium: string }>> = {
  focus_custom_duration: { free: '固定の集中時間を利用', premium: '好きな集中時間を設定' },
  records: { free: '利用できません', premium: '写真・ひとこと・メモを保存' },
  reflection: { free: '利用できません', premium: '今月の写真・言葉・ベストをまとめる' },
  calendar: { free: '広告1回で1予定を取り込み', premium: '広告なしで取り込み' },
  route: { free: '地図は利用可・共有は制限', premium: '地図・共有を利用' },
  travel_apps: { free: '利用できません', premium: '登録した移動アプリを起動' },
  nudge: { free: '基本の通知', premium: '段階的な通知・再通知' },
  time: { free: '基本の記録のみ', premium: '準備・出発・集中などを分析' },
  behavior: { free: '利用できません', premium: '最近の行動を振り返る' },
  month: { free: '今日から7日間', premium: '月単位の予定・履歴を確認' },
  history: { free: '基本の履歴のみ', premium: '履歴を検索・詳しく確認' },
  recovery: { free: '利用できません', premium: '遅れた予定を立て直す' },
  templates: { free: '通常のひな型を利用', premium: '設定ごと保存して再利用' },
  wish: { free: '目標・叶えたいことを広告で追加', premium: '行動に分けて進捗まで確認' },
  affirmation: { free: '利用できません', premium: '好きな言葉を指定時刻に通知' },
  photo_design: { free: 'Trial・広告・買い切りで一部利用', premium: '対象デザイン・写真を制限なく利用' },
};

const PREMIUM_COMPARISON_ROWS: Array<{ label: string; free: '○' | '△' | '×'; premium: '○' | '△' | '×'; note?: string }> = [
  { label: '基本のToDo・予定管理', free: '○', premium: '○' },
  { label: '基本の集中タイム', free: '○', premium: '○' },
  { label: '今日の記録', free: '×', premium: '○' },
  { label: '今月を振り返る', free: '×', premium: '○' },
  { label: 'カレンダー取り込み', free: '△', premium: '○', note: 'Freeは広告1回で1予定' },
  { label: '地図・共有', free: '△', premium: '○', note: '地図は無料、共有はPremium' },
  { label: '行動分析・詳細な履歴', free: '×', premium: '○' },
  { label: '叶えたいこと・行動', free: '△', premium: '○', note: '目標・Wish追加は広告、行動はPremium' },
  { label: '選べるデザイン・写真', free: '△', premium: '○', note: 'Trial・広告・買い切りで利用可' },
  { label: 'アファメーション', free: '×', premium: '○' },
];

function PremiumComparison({ styles, primaryText, secondaryText, border, surfaceSoft, accent }: { styles: any; primaryText: string; secondaryText: string; border: string; surfaceSoft: string; accent: string }) {
  return <View style={[styles.premiumComparison, { borderTopColor: border }]}>
    <Text style={[styles.premiumSectionTitle, { color: primaryText }]}>Free / Premium</Text>
    <Text style={[styles.premiumSectionCopy, { color: secondaryText }]}>使える範囲の違いをまとめています。</Text>
    <View style={[styles.premiumComparisonHeader, { borderBottomColor: border }]}><Text style={[styles.premiumComparisonLabel, { color: secondaryText }]}>機能</Text><Text style={[styles.premiumComparisonCell, { color: secondaryText }]}>Free</Text><Text style={[styles.premiumComparisonCell, { color: accent }]}>Premium</Text></View>
    {PREMIUM_COMPARISON_ROWS.map((row) => <View key={row.label} style={[styles.premiumComparisonRow, { borderBottomColor: border }]}>
      <View style={styles.premiumComparisonLabelWrap}><Text style={[styles.premiumComparisonLabel, { color: primaryText }]}>{row.label}</Text>{row.note && <Text style={[styles.premiumComparisonNote, { color: secondaryText }]}>{row.note}</Text>}</View>
      <Text style={[styles.premiumComparisonCell, { color: row.free === '×' ? secondaryText : primaryText }]}>{row.free}</Text>
      <Text style={[styles.premiumComparisonCell, { color: row.premium === '×' ? secondaryText : accent }]}>{row.premium}</Text>
    </View>)}
    <View style={[styles.premiumComparisonLegend, { backgroundColor: surfaceSoft }]}><Text style={[styles.premiumComparisonLegendText, { color: secondaryText }]}>○ 利用できます　△ 一部制限・広告・Trial　× Premium限定</Text></View>
  </View>;
}

function LegacyPreviewFallback({ kind, styles }: { kind: PremiumPreviewKind; styles: any }) {
  if (kind === 'calendar') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>予定表の表示イメージ</Text>{[['09:00', '朝会', '外部予定'], ['11:00', '資料提出', 'Rhythm'], ['14:00', '病院訪問', '外部予定'], ['18:30', 'ピラティス', '外部予定']].map(([time, title, source]) => <View key={`${time}-${title}`} style={styles.previewScheduleRow}><Text style={styles.previewTime}>{time}</Text><Text style={styles.previewScheduleTitle}>{title}</Text><Text style={[styles.previewSource, source === 'Rhythm' && styles.previewSourceRhythm]}>{source}</Text></View>)}<View style={styles.previewFlow}><Text style={styles.previewFlowText}>14:00 病院訪問</Text><Text style={styles.previewArrow}>↓</Text><Text style={styles.previewFlowButton}>出発を考える</Text></View></View>;
  if (kind === 'records') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>今日の記録</Text><View style={styles.previewTemplateSource}><Text style={styles.previewCompareTag}>8月23日</Text><Text style={styles.previewTemplateTitle}>写真・ひとこと・メモ</Text><Text style={styles.previewTemplateMeta}>カレンダーから記録済みの日を確認</Text></View><Text style={styles.previewTemplateReady}>登録後も編集・削除できます</Text></View>;
  if (kind === 'reflection') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>今月を振り返る</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>今月の言葉</Text><Text style={styles.previewTemplateTitle}>自分のペースで進む</Text></View><Text style={styles.previewTemplateChoose}>写真 3枚</Text></View><Text style={styles.previewTemplateReady}>テンプレートで画像保存・共有</Text></View>;
  if (kind === 'floral') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>Premium限定デザイン</Text><View style={styles.previewRecoveryGrid}>{['花柄1', '花柄2', '花柄3'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View></View>;
  if (kind === 'dot' || kind === 'check') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>Premium限定デザイン</Text><View style={styles.previewTemplateSource}><Text style={styles.previewTemplateTitle}>{kind === 'dot' ? 'ドット' : 'チェックデザイン'}</Text><Text style={styles.previewTemplateMeta}>背景・カード・アクセントを統一</Text></View></View>;
  if (kind === 'history') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>詳細な履歴・検索</Text><View style={styles.previewScheduleRow}><Text style={styles.previewTime}>8/23</Text><Text style={styles.previewScheduleTitle}>完了したタスク</Text><Text style={styles.previewSource}>検索</Text></View><View style={styles.previewScheduleRow}><Text style={styles.previewTime}>8/22</Text><Text style={styles.previewScheduleTitle}>写真の記録</Text><Text style={styles.previewSource}>履歴</Text></View></View>;
  if (kind === 'route') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>地図・共有</Text><View style={styles.previewRouteMap}><Text style={styles.previewRouteMapTitle}>目的地を地図で確認</Text><Text style={styles.previewRouteMapPin}>↗</Text><Text style={styles.previewRouteMapPlace}>予定の内容を共有できます</Text></View><Text style={styles.previewRouteCopy}>無料版でも地図を利用できます。共有はPremiumで利用できます。</Text></View>;
  if (kind === 'nudge') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>通知の表示イメージ</Text>{[['09:00', '忘れてない？', '資料を送る'], ['09:05', 'そろそろ始められそう？', 'もう一度確認'], ['09:08', 'まだ終わってなければ', '今確認しよう']].map(([time, title, copy], index) => <View key={time} style={[styles.previewNotification, index > 0 && styles.previewNotificationLater]}><Text style={styles.previewNotificationTime}>{time}</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>{title}</Text><Text style={styles.previewNotificationCopy}>{copy}</Text></View></View>)}</View>;
  if (kind === 'time') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><Text style={styles.previewMetricLabel}>準備開始</Text><View style={styles.previewTimeCompare}><View><Text style={styles.previewCompareLabel}>予定</Text><Text style={styles.previewCompareValue}>12:10</Text></View><Text style={styles.previewCompareArrow}>→</Text><View><Text style={styles.previewCompareLabel}>実際</Text><Text style={styles.previewCompareValue}>12:24</Text></View></View><Text style={styles.previewMetricBig}>平均14分遅め</Text><Text style={styles.previewRecordCount}>記録 8回</Text></View>;
  if (kind === 'behavior') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><Text style={styles.previewMetricLabel}>最近の行動</Text><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>動き始め</Text><Text style={styles.previewInsightValue}>通知から平均17分で反応</Text></View><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>集中</Text><Text style={styles.previewInsightValue}>15分が比較的続きやすい傾向</Text></View><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>延長</Text><Text style={styles.previewInsightValue}>8回中5回はその後完了</Text></View></View>;
  if (kind === 'month') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>予定表の表示イメージ</Text><View style={styles.previewPlanCompare}><View style={styles.previewFreeWeek}><Text style={styles.previewCompareTag}>無料・今日から7日</Text><View style={styles.previewWeekRow}>{['6', '7', '8', '9', '10', '11', '12'].map((day) => <Text key={day} style={styles.previewWeekDay}>7/{day}</Text>)}</View></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewMonth}><Text style={styles.previewMonthTitle}>2026年 7月</Text><Text style={styles.previewMonthWeek}>日  月  火  水  木  金  土</Text><Text style={styles.previewMonthDays}>         1    2    3    4{`\n`} 5    6    7    8    9  10  11{`\n`}12  13  14  15  16  17  18{`\n`}19  20  21  22  23  24  25</Text></View></View></View>;
  if (kind === 'wish') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>叶えたいことの表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewCompareTag}>今月の目標</Text><Text style={styles.previewTemplateTitle}>自分のペースを整える</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>叶えたいこと</Text><Text style={styles.previewTemplateTitle}>週に1冊、本を読む</Text></View><Text style={styles.previewTemplateChoose}>✓</Text></View><Text style={styles.previewTemplateReady}>今日につながる行動　10分読む</Text></View>;
  if (kind === 'affirmation') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>通知の表示イメージ</Text><View style={styles.previewNotification}><Text style={styles.previewNotificationTime}>08:30</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>今日の言葉</Text><Text style={styles.previewNotificationCopy}>私は、自分のペースで進める</Text></View></View><View style={[styles.previewNotification, styles.previewNotificationLater]}><Text style={styles.previewNotificationTime}>毎日</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>自分で書いた言葉</Text><Text style={styles.previewNotificationCopy}>好きな時間に届ける</Text></View></View></View>;
  if (kind === 'photo_design') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>Design Premium</Text><View style={styles.previewRecoveryGrid}>{['花柄1〜3', 'ドット', 'チェックデザイン', '写真背景'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View><Text style={styles.previewRouteCopy}>柄・写真・テーマカラーを組み合わせて、画面全体を着せ替えできます。</Text></View>;
  if (kind === 'templates') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text><Text style={styles.previewTemplateMeta}>予定　優先度 高　通知 09:00</Text><Text style={styles.previewTemplateMeta}>準備30分　移動40分　余裕15分</Text><Text style={styles.previewTemplateSave}>設定ごとひな型に保存</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>マイひな型</Text><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text></View><Text style={styles.previewTemplateChoose}>選ぶ ›</Text></View><Text style={styles.previewTemplateReady}>設定済みでフォームへ反映</Text></View>;
  return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>立て直しの表示イメージ</Text><View style={styles.previewDanger}><Text style={styles.previewDangerText}>予定どおりは厳しい</Text></View><View style={styles.previewRecoveryGrid}>{['今から出発', '到着予定を変更', '遅れる連絡', '予定を組み直す'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View></View>;
}

function PremiumPreviewViewport({ children, styles, surface, border }: { children: React.ReactNode; styles: any; surface: string; border: string }) {
  return <View style={[styles.premiumPreviewViewport, { backgroundColor: surface, borderColor: border }]} pointerEvents="none"><View style={styles.premiumPreviewViewportContent}>{children}</View></View>;
}

function PremiumFeatureEntryCard({ icon, title, active, chicPalette, onPress, styles, primaryText, accent, accentStrong, border }: { icon: string; title: string; active: boolean; chicPalette?: ChicThemePalette; onPress: () => void; styles: any; primaryText: string; accent: string; accentStrong: string; border: string }) {
  return <Pressable onPress={onPress} style={[styles.premiumEntryCard, { width: 112, minHeight: 44, backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: active ? 2 : 1, borderBottomColor: active ? accent : border, borderRadius: 0, paddingHorizontal: 4, paddingVertical: 8 }]}>
    <Text style={[styles.premiumFeatureIcon, { color: active ? accent : primaryText }, chicPalette && { color: active ? chicPalette.accent : chicPalette.textSecondary }]}>{icon}</Text>
    <Text numberOfLines={2} style={[styles.premiumEntryTitle, { color: active ? accentStrong : primaryText, marginTop: 3 }, chicPalette && { color: active ? chicPalette.accentStrong : chicPalette.textPrimary }]}>{title}</Text>
  </Pressable>;
}

function PremiumFeatureDiff({ kind, styles, primaryText, secondaryText, accent, border, surfaceSoft }: { kind: PremiumPreviewKind; styles: any; primaryText: string; secondaryText: string; accent: string; border: string; surfaceSoft: string }) {
  const diff = PREMIUM_FEATURE_DIFFS[kind];
  if (!diff) return null;
  return <View style={[styles.premiumFeatureDiff, { borderColor: border, backgroundColor: surfaceSoft }]}>
    <Text style={[styles.premiumFeatureDiffHeading, { color: primaryText }]}>FreeとPremiumの違い</Text>
    <View style={[styles.premiumFeatureDiffRow, { borderTopColor: border }]}><View style={styles.premiumFeatureDiffCopy}><Text style={[styles.premiumFeatureDiffLabel, { color: secondaryText }]}>Free</Text><Text style={[styles.premiumFeatureDiffValue, { color: primaryText }]}>{diff.free}</Text></View><View style={styles.premiumFeatureDiffCopy}><Text style={[styles.premiumFeatureDiffLabel, { color: accent }]}>Premium</Text><Text style={[styles.premiumFeatureDiffValue, { color: primaryText }]}>{diff.premium}</Text></View></View>
  </View>;
}

function PremiumFeatureDetail({ icon, kind, title, description, designMode, chicPalette, styles, renderReadOnlyPreview, surface, surfaceSoft, border, primaryText, secondaryText, accentColor }: { icon: string; kind: PremiumPreviewKind; title: string; description: string; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any; renderReadOnlyPreview?: (kind: PremiumPreviewKind) => React.ReactNode; surface: string; surfaceSoft: string; border: string; primaryText: string; secondaryText: string; accentColor: string }) {
  const isMono = designMode !== 'chic';
  const previewStyles = designMode === 'dark' ? { ...styles, ...darkPreviewStyleOverrides } : styles;
  return <View style={styles.premiumFeatureBlock}>
    <PremiumPreviewViewport styles={styles} surface={surface} border={border}>{renderReadOnlyPreview?.(kind) ?? <LegacyPreviewFallback kind={kind} styles={previewStyles} />}</PremiumPreviewViewport>
    <View style={[styles.premiumFeatureTextPlate, { paddingHorizontal: 0, paddingTop: 16 }]}><View style={styles.premiumDetailHeading}><Text style={[styles.premiumDetailIcon, { color: accentColor }]}>{icon}</Text><Text style={[styles.premiumFeatureTitle, { color: primaryText }]}>{title}</Text></View><Text style={[styles.premiumFeatureDescription, { color: secondaryText }]}>{description}</Text><PremiumFeatureDiff kind={kind} styles={styles} primaryText={primaryText} secondaryText={secondaryText} accent={accentColor} border={border} surfaceSoft={surfaceSoft} /></View>
  </View>;
}

export function PremiumModal({ visible, initialFeatureId, designMode, chicPalette, planTier, isDevelopment = false, onMockPlanTier, onClose, styles, helpers, renderReadOnlyPreview, products, productStatus = products ? 'ready' : 'unavailable', onRestorePurchase }: { visible: boolean; initialFeatureId: PremiumGuideFeatureId; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; isDevelopment?: boolean; onMockPlanTier?: (tier: PlanTier | null) => void; onClose: () => void; styles: any; helpers: any; renderReadOnlyPreview?: (kind: PremiumPreviewKind) => React.ReactNode; products?: PremiumStoreProducts; productStatus?: PremiumStoreProductStatus; onRestorePurchase?: () => void }) {
  const { getThemeTokens } = helpers;
  const theme = getThemeTokens(designMode);
  const designSurface = designMode === 'chic' && chicPalette ? { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border } : undefined;
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const accentStrong = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent;
  const surface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : theme.colors.surface;
  const surfaceSoft = designMode === 'chic' && chicPalette ? chicPalette.cardTint : theme.colors.secondarySurface;
  const primaryText = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : theme.colors.primaryText;
  const secondaryText = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText;
  const accentText = designMode === 'chic' && chicPalette ? chicPalette.onAccent : designMode === 'dark' ? theme.colors.screenBackground : theme.colors.surface;
  const previewStyles = {
    ...styles,
    ...(designMode === 'dark' ? darkPreviewStyleOverrides : {}),
    premiumPreview: { ...styles.premiumPreview, backgroundColor: surface, borderColor: theme.colors.border },
    previewImageLabel: { ...styles.previewImageLabel, color: secondaryText },
    previewTime: { ...styles.previewTime, color: primaryText },
    previewScheduleTitle: { ...styles.previewScheduleTitle, color: primaryText },
    previewSource: { ...styles.previewSource, color: primaryText, backgroundColor: surfaceSoft },
    previewFlowText: { ...styles.previewFlowText, color: secondaryText },
    previewArrow: { ...styles.previewArrow, color: secondaryText },
    previewFlowButton: { ...styles.previewFlowButton, color: accentText, backgroundColor: accent },
    previewMetricLabel: { ...styles.previewMetricLabel, color: secondaryText },
    previewMetricBig: { ...styles.previewMetricBig, color: accent },
    previewRecordCount: { ...styles.previewRecordCount, color: secondaryText },
    previewTemplateTitle: { ...styles.previewTemplateTitle, color: primaryText },
    previewTemplateMeta: { ...styles.previewTemplateMeta, color: secondaryText },
    previewTemplateChoose: { ...styles.previewTemplateChoose, color: accent },
    previewTemplateReady: { ...styles.previewTemplateReady, color: secondaryText },
    previewCompareTag: { ...styles.previewCompareTag, color: secondaryText },
    previewRecoveryText: { ...styles.previewRecoveryText, color: primaryText },
    previewScheduleRow: { ...styles.previewScheduleRow, borderBottomColor: theme.colors.border },
    previewSourceRhythm: { ...styles.previewSourceRhythm, color: accentText, backgroundColor: accent },
    previewRouteMap: { ...styles.previewRouteMap, backgroundColor: surfaceSoft, borderColor: theme.colors.border },
    previewRouteMapTitle: { ...styles.previewRouteMapTitle, color: accent },
    previewRouteMapPlace: { ...styles.previewRouteMapPlace, color: primaryText },
    previewRouteCopy: { ...styles.previewRouteCopy, color: secondaryText },
    previewNotification: { ...styles.previewNotification, backgroundColor: surfaceSoft, borderColor: theme.colors.border },
    previewNotificationTime: { ...styles.previewNotificationTime, color: primaryText },
    previewNotificationTitle: { ...styles.previewNotificationTitle, color: primaryText },
    previewNotificationCopy: { ...styles.previewNotificationCopy, color: secondaryText },
    previewCompareLabel: { ...styles.previewCompareLabel, color: secondaryText },
    previewCompareValue: { ...styles.previewCompareValue, color: primaryText },
    previewCompareArrow: { ...styles.previewCompareArrow, color: secondaryText },
    previewInsightRow: { ...styles.previewInsightRow, borderTopColor: theme.colors.border },
    previewInsightLabel: { ...styles.previewInsightLabel, color: secondaryText },
    previewInsightValue: { ...styles.previewInsightValue, color: primaryText },
    previewWeekDay: { ...styles.previewWeekDay, color: primaryText, borderColor: theme.colors.border },
    previewMonth: { ...styles.previewMonth, backgroundColor: surfaceSoft },
    previewMonthTitle: { ...styles.previewMonthTitle, color: primaryText },
    previewMonthWeek: { ...styles.previewMonthWeek, color: secondaryText },
    previewMonthDays: { ...styles.previewMonthDays, color: primaryText },
    previewTemplateSource: { ...styles.previewTemplateSource, borderColor: theme.colors.border },
    previewTemplateSaved: { ...styles.previewTemplateSaved, backgroundColor: surfaceSoft },
    previewDanger: { ...styles.previewDanger, backgroundColor: surfaceSoft },
    previewDangerText: { ...styles.previewDangerText, color: theme.colors.danger },
    previewRecoveryOption: { ...styles.previewRecoveryOption, backgroundColor: surfaceSoft },
  };
  const initialIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === initialFeatureId));
  const [selectedFeatureId, setSelectedFeatureId] = useState<PremiumGuideFeatureId>(initialFeatureId);
  const featurePickerRef = useRef<ScrollView>(null);
  const selectedFeature = PREMIUM_GUIDE_FEATURES.find((feature) => feature.id === selectedFeatureId) ?? PREMIUM_GUIDE_FEATURES[initialIndex] ?? PREMIUM_GUIDE_FEATURES[0]!;
  const selectedIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === selectedFeature.id));
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'processing' | 'success' | 'unavailable'>('idle');
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const monthlyAmount = products?.monthly?.amount;
  const annualAmount = products?.annual?.amount;
  const annualMonthlyEquivalent = typeof annualAmount === 'number' ? annualAmount / 12 : undefined;
  const annualSavingsPercent = typeof monthlyAmount === 'number' && monthlyAmount > 0 && typeof annualAmount === 'number'
    ? Math.max(0, Math.round((1 - annualAmount / (monthlyAmount * 12)) * 100))
    : undefined;
  const selectedProduct = products?.[selectedPlan];
  const canPurchaseSelectedPlan = planTier === 'premium' || (productStatus === 'ready' && Boolean(selectedProduct)) || (isDevelopment && Boolean(onMockPlanTier));
  useEffect(() => {
    if (!visible) return;
    setSelectedFeatureId(initialFeatureId);
    setPurchaseOpen(false);
    setComparisonOpen(false);
    setPurchaseStatus('idle');
    setSelectedPlan('annual');
  }, [initialFeatureId, visible]);
  useEffect(() => {
    if (!visible) {
      setPurchaseOpen(false);
      setComparisonOpen(false);
      setPurchaseStatus('idle');
    }
  }, [visible]);
  useEffect(() => {
    if (visible) featurePickerRef.current?.scrollTo({ x: Math.max(0, selectedIndex * 122 - 70), animated: false });
  }, [selectedIndex, visible]);
  // Do not keep the feature previews mounted while the modal is closed. This
  // avoids rendering all preview cards during app startup and while navigating
  // unrelated screens, while preserving the existing modal state on reopen.
  if (!visible) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Premiumを閉じる" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.modalSheet, styles.premiumModalSheet, { backgroundColor: theme.colors.screenBackground }, designSurface]}>
        <View style={styles.modalHandle} />
        <View style={styles.premiumCarouselHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.premiumCarouselBrand, { color: primaryText }]}>Rhythm Premium</Text>
            <Text style={[styles.premiumCarouselCopy, { color: secondaryText }]}>予定を立てるだけでなく、間に合う・続けるまで支えます。</Text>
            <Text style={[styles.premiumCarouselCopy, { color: secondaryText }, { marginTop: 5, fontSize: 10 }]}>{purchaseOpen ? 'Premiumを始める準備をしています。' : '記録・分析・デザイン・共有を、あなたの使い方に合わせて広げます。'}</Text>
          </View>
          {purchaseOpen ? <Pressable accessibilityRole="button" style={styles.premiumHeaderClose} onPress={() => { setPurchaseOpen(false); setPurchaseStatus('idle'); }}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>戻る</Text></Pressable> : <Pressable accessibilityRole="button" style={styles.premiumHeaderClose} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>×</Text></Pressable>}
        </View>
        {!purchaseOpen && <View style={styles.premiumTopActions}><Pressable accessibilityRole="button" style={[styles.premiumTopCta, { backgroundColor: accent }]} onPress={() => setPurchaseOpen(true)}><Text style={[styles.premiumTopCtaText, { color: accentText }]}>{planTier === 'premium' ? 'Premium有効中' : 'Premiumを始める'}</Text></Pressable><Pressable accessibilityRole="button" style={styles.premiumComparisonLink} onPress={() => setComparisonOpen(true)}><Text style={[styles.premiumComparisonLinkText, { color: accentStrong }]}>Freeとの違いを見る</Text></Pressable></View>}
        {purchaseOpen ? <ScrollView style={styles.premiumCarouselArea} contentContainerStyle={styles.premiumModalScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <View style={[styles.premiumPurchasePanel, { backgroundColor: surface, borderColor: accent }]}>
            <Text style={[styles.premiumPurchaseTitle, { color: primaryText }]}>Premiumを始める</Text>
            <Text style={[styles.premiumPurchaseCopy, { color: secondaryText }]}>記録・振り返り・デザイン・分析を、Rhythmの使い方に合わせて広げます。</Text>
            <View style={[styles.premiumPurchaseBenefits, { borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}><Text style={[styles.premiumPurchaseBenefit, { color: primaryText }]}>今日の記録と今月の振り返り</Text><Text style={[styles.premiumPurchaseBenefit, { color: primaryText }]}>行動分析・詳細な履歴・検索</Text><Text style={[styles.premiumPurchaseBenefit, { color: primaryText }]}>選べるデザイン・写真・アファメーション</Text></View>
            <Text style={[styles.premiumPlanHeading, { color: primaryText }]}>プランを選択</Text>
            {(['annual', 'monthly'] as const).map((plan) => {
              const product = products?.[plan];
              const isAnnual = plan === 'annual';
              return <Pressable key={plan} accessibilityRole="radio" accessibilityState={{ selected: selectedPlan === plan }} onPress={() => setSelectedPlan(plan)} style={[styles.premiumPlanCard, { backgroundColor: selectedPlan === plan ? surfaceSoft : surface, borderColor: selectedPlan === plan ? accent : theme.colors.border }]}>
                <View style={{ flex: 1 }}><Text style={[styles.premiumPlanTitle, { color: primaryText }]}>{isAnnual ? '年額プラン' : '月額プラン'}</Text>{isAnnual && <Text style={[styles.premiumPlanRecommended, { color: accent }]}>おすすめ</Text>}{isAnnual && annualMonthlyEquivalent !== undefined && <Text style={[styles.premiumPlanMeta, { color: secondaryText }]}>月あたり約 {annualMonthlyEquivalent.toFixed(0)} {products?.annual?.displayPrice.replace(/[0-9.,\s]/g, '').trim()}{annualSavingsPercent !== undefined ? ` ・ 約${annualSavingsPercent}%お得` : ''}</Text>}</View>
                <Text style={[styles.premiumPlanPrice, { color: product ? accentStrong : secondaryText }]}>{productStatus === 'loading' ? '価格を確認中…' : product ? `${product.displayPrice} / ${product.periodLabel}` : '価格を取得できませんでした'}</Text>
              </Pressable>;
            })}
            {productStatus !== 'ready' || !products?.annual || !products?.monthly ? <View style={[styles.premiumPurchaseStatus, { borderColor: theme.colors.border }]}><Text style={[styles.premiumPurchaseStatusTitle, { color: primaryText }]}>{productStatus === 'loading' ? '価格を確認中…' : '価格を取得できませんでした'}</Text><Text style={[styles.premiumPurchaseStatusCopy, { color: secondaryText }]}>{productStatus === 'loading' ? 'App Storeの商品情報を確認しています。' : 'App Storeの商品情報を取得後、ローカライズされた価格が表示されます。'}</Text></View> : null}
            <Text style={[styles.premiumPurchaseNote, { color: secondaryText }]}>購入前にApp Storeの表示をご確認ください。いつでも解約できます。</Text>
            {purchaseStatus === 'success' && <View style={[styles.premiumPurchaseStatus, { borderColor: accent }]}><Text style={[styles.premiumPurchaseStatusTitle, { color: accentStrong }]}>Premiumを有効にしました</Text><Text style={[styles.premiumPurchaseStatusCopy, { color: secondaryText }]}>すべてのPremium機能を利用できます。</Text></View>}
            {purchaseStatus === 'unavailable' && <View style={[styles.premiumPurchaseStatus, { borderColor: theme.colors.border }]}><Text style={[styles.premiumPurchaseStatusTitle, { color: primaryText }]}>購入処理を準備しています</Text><Text style={[styles.premiumPurchaseStatusCopy, { color: secondaryText }]}>現在はApp Storeの購入画面を利用できません。しばらくしてから再度お試しください。</Text></View>}
            <Pressable disabled={purchaseStatus === 'processing' || planTier === 'premium' || !canPurchaseSelectedPlan} onPress={() => {
              if (isDevelopment && onMockPlanTier) {
                setPurchaseStatus('processing');
                onMockPlanTier('premium');
                setPurchaseStatus('success');
              } else {
                setPurchaseStatus('unavailable');
              }
            }} style={[styles.premiumPurchaseButton, { backgroundColor: planTier === 'premium' || !canPurchaseSelectedPlan ? surfaceSoft : accent }]}><Text style={[styles.premiumPurchaseButtonText, { color: planTier === 'premium' || !canPurchaseSelectedPlan ? secondaryText : accentText }]}>{planTier === 'premium' ? 'Premium有効中' : purchaseStatus === 'processing' ? '確認中…' : productStatus === 'loading' ? '価格を確認中…' : selectedProduct ? '購入する' : isDevelopment && onMockPlanTier ? '開発用に確認' : '価格を確認できません'}</Text></Pressable>
            <Pressable accessibilityRole="button" style={styles.premiumTextLink} onPress={() => { if (onRestorePurchase) onRestorePurchase(); else setPurchaseStatus('unavailable'); }}><Text style={[styles.premiumTextLinkText, { color: accentStrong }]}>購入を復元</Text></Pressable>
            {isDevelopment && onMockPlanTier && <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => { onMockPlanTier('free'); setPurchaseStatus('idle'); }} style={[styles.premiumDevButton, { borderColor: theme.colors.border }]}><Text style={{ color: secondaryText, fontSize: 11, fontWeight: '800' }}>無料版で確認</Text></Pressable>
              <Pressable onPress={() => { onMockPlanTier(null); setPurchaseStatus('idle'); }} style={[styles.premiumDevButton, { borderColor: theme.colors.border }]}><Text style={{ color: secondaryText, fontSize: 11, fontWeight: '800' }}>環境設定へ戻す</Text></Pressable>
            </View>}
          </View>
          <Pressable style={styles.premiumTextLink} onPress={onClose}><Text style={[styles.premiumTextLinkText, { color: accentStrong }]}>閉じる</Text></Pressable>
        </ScrollView> : <ScrollView style={styles.premiumCarouselArea} contentContainerStyle={styles.premiumModalScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <ScrollView ref={featurePickerRef} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} style={styles.premiumFeaturePicker} contentContainerStyle={styles.premiumFeaturePickerContent}>
            {PREMIUM_GUIDE_FEATURES.map((feature) => <PremiumFeatureEntryCard key={feature.id} icon={PREMIUM_FEATURE_ICONS[feature.id]} title={feature.title} active={feature.id === selectedFeature.id} chicPalette={chicPalette} accent={accent} accentStrong={accentStrong} primaryText={primaryText} border={theme.colors.border} onPress={() => setSelectedFeatureId(feature.id)} styles={styles} />)}
          </ScrollView>
          <View style={styles.premiumFeatureStage}>
            <PremiumFeatureDetail key={selectedFeature.id} icon={PREMIUM_FEATURE_ICONS[selectedFeature.id]} kind={selectedFeature.kind} title={selectedFeature.title} description={selectedFeature.description} designMode={designMode} chicPalette={chicPalette} styles={styles} renderReadOnlyPreview={renderReadOnlyPreview} surface={surface} surfaceSoft={surfaceSoft} border={theme.colors.border} primaryText={primaryText} secondaryText={secondaryText} accentColor={accent} />
          </View>
          {planTier !== 'premium' && <Pressable accessibilityRole="button" style={[styles.premiumBottomCta, { backgroundColor: accent }]} onPress={() => setPurchaseOpen(true)}><Text style={[styles.premiumBottomCtaText, { color: accentText }]}>Premiumを始める</Text></Pressable>}
          <Pressable style={styles.premiumTextLink} onPress={onClose}><Text style={[styles.premiumTextLinkText, { color: accentStrong }]}>Rhythmに戻る</Text></Pressable>
        </ScrollView>}
        {comparisonOpen && <Modal visible transparent animationType="slide" onRequestClose={() => setComparisonOpen(false)}><View style={styles.modalBackdrop}><Pressable accessibilityRole="button" accessibilityLabel="比較を閉じる" style={StyleSheet.absoluteFill} onPress={() => setComparisonOpen(false)} /><View style={[styles.premiumComparisonSheet, { backgroundColor: theme.colors.screenBackground, borderColor: theme.colors.border }]}><View style={styles.modalHandle} /><View style={styles.premiumComparisonSheetHeader}><View style={{ flex: 1 }}><Text style={[styles.premiumSectionTitle, { color: primaryText }]}>Freeとの違い</Text><Text style={[styles.premiumSectionCopy, { color: secondaryText }]}>Premiumで広がる機能を確認できます。</Text></View><Pressable onPress={() => setComparisonOpen(false)} style={styles.premiumHeaderClose}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>×</Text></Pressable></View><ScrollView style={{ flex: 1 }} contentContainerStyle={styles.premiumComparisonSheetScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled"><PremiumComparison styles={styles} primaryText={primaryText} secondaryText={secondaryText} border={theme.colors.border} surfaceSoft={surfaceSoft} accent={accent} /><Pressable accessibilityRole="button" style={[styles.premiumBottomCta, { backgroundColor: accent }]} onPress={() => { setComparisonOpen(false); setPurchaseOpen(true); }}><Text style={[styles.premiumBottomCtaText, { color: accentText }]}>Premiumを始める</Text></Pressable><Pressable style={styles.premiumTextLink} onPress={() => setComparisonOpen(false)}><Text style={[styles.premiumTextLinkText, { color: accentStrong }]}>閉じる</Text></Pressable></ScrollView></View></View></Modal>}
      </View>
    </View>
  </Modal>;
}
