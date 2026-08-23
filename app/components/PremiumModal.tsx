import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode } from '../theme';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PlanTier } from '../premiumAccess';

type PremiumPreviewKind = PremiumGuideFeatureId;

const PREMIUM_GUIDE_FEATURES: Array<{ id: PremiumGuideFeatureId; kind: PremiumPreviewKind; title: string; description: string }> = [
  { id: 'records', kind: 'records', title: '今日の記録', description: '写真・ひとこと・メモを日付ごとに保存。カレンダーから記録済みの日を確認し、登録後の編集・削除もできます。' },
  { id: 'reflection', kind: 'reflection', title: '今月を振り返る', description: 'カレンダー上部のボタンから開く独立機能。今月の写真・言葉・ベストをテンプレートやレイアウトでまとめ、画像保存・共有できます。' },
  { id: 'calendar', kind: 'calendar', title: 'カレンダー連携', description: '普段使っているカレンダーの予定も、Rhythmの予定表にまとめて表示できます。' },
  { id: 'route', kind: 'route', title: '地図・共有', description: '予定の場所を地図で確認し、予定内容をPremiumの共有機能で届けられます。' },
  { id: 'nudge', kind: 'nudge', title: '高度な通知', description: '段階的な通知や反応に応じた再通知で、大切な予定を忘れにくくします。' },
  { id: 'time', kind: 'time', title: '行動分析', description: '通知・準備・出発・集中など、実際の行動記録から自分の傾向を振り返れます。' },
  { id: 'behavior', kind: 'behavior', title: '行動の振り返り', description: '最近の反応や集中の記録を、責めない言葉で確認できます。' },
  { id: 'month', kind: 'month', title: '月表示と詳細履歴', description: '7日を超えた予定や過去の完了・集中・出発記録を、月単位で確認できます。' },
  { id: 'history', kind: 'history', title: '詳細な履歴・検索', description: '過去の完了タスクや記録を、検索とカレンダーから詳しく確認できます。' },
  { id: 'recovery', kind: 'recovery', title: '遅れた時も、ここから立て直す', description: '遅れたことを責めるのではなく、今からできる行動を表示。予定が崩れても、すぐに戻れる形を考えます。' },
  { id: 'templates', kind: 'templates', title: 'タスクひな型', description: '一度作ったタスクのカテゴリ・優先度・通知設定をひな型として保存し、次回の登録を簡単にします。' },
  { id: 'wish', kind: 'wish', title: '叶えたいことを、今月の行動へつなげる', description: '今月のテーマ、叶えたいこと、今日につながる行動をひとつの画面で整理。叶えた日や月の振り返りも残せます。' },
  { id: 'affirmation', kind: 'affirmation', title: '好きな言葉を、選んだ時間に届ける', description: '自分で書いたアファメーションを毎日指定時刻に通知。忙しい日も、自分の軸へ静かに戻れます。' },
  { id: 'photo_design', kind: 'photo_design', title: '選べるデザイン', description: '花柄1〜3、ドット、チェックデザイン、写真背景をPremium限定で利用できます。選択中のデザインカラーと組み合わせて、Rhythm全体を自分らしく整えられます。' },
];

function PremiumMiniPreview({ kind, designMode, styles }: { kind: PremiumPreviewKind; designMode: DesignMode; styles: any }) {
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
  if (kind === 'wish') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>叶えたいことの表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewCompareTag}>今月のテーマ</Text><Text style={styles.previewTemplateTitle}>自分のペースを整える</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>叶えたいこと</Text><Text style={styles.previewTemplateTitle}>週に1冊、本を読む</Text></View><Text style={styles.previewTemplateChoose}>✓</Text></View><Text style={styles.previewTemplateReady}>今日につながる行動　10分読む</Text></View>;
  if (kind === 'affirmation') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>通知の表示イメージ</Text><View style={styles.previewNotification}><Text style={styles.previewNotificationTime}>08:30</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>今日の言葉</Text><Text style={styles.previewNotificationCopy}>私は、自分のペースで進める</Text></View></View><View style={[styles.previewNotification, styles.previewNotificationLater]}><Text style={styles.previewNotificationTime}>毎日</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>自分で書いた言葉</Text><Text style={styles.previewNotificationCopy}>好きな時間に届ける</Text></View></View></View>;
  if (kind === 'photo_design') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>Design Premium</Text><View style={styles.previewRecoveryGrid}>{['花柄1〜3', 'ドット', 'チェックデザイン', '写真背景'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View><Text style={styles.previewRouteCopy}>柄・写真・テーマカラーを組み合わせて、画面全体を着せ替えできます。</Text></View>;
  if (kind === 'templates') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text><Text style={styles.previewTemplateMeta}>予定　優先度 高　通知 09:00</Text><Text style={styles.previewTemplateMeta}>準備30分　移動40分　余裕15分</Text><Text style={styles.previewTemplateSave}>設定ごとひな型に保存</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>マイひな型</Text><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text></View><Text style={styles.previewTemplateChoose}>選ぶ ›</Text></View><Text style={styles.previewTemplateReady}>設定済みでフォームへ反映</Text></View>;
  return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>立て直しの表示イメージ</Text><View style={styles.previewDanger}><Text style={styles.previewDangerText}>予定どおりは厳しい</Text></View><View style={styles.previewRecoveryGrid}>{['今から出発', '到着予定を変更', '遅れる連絡', '予定を組み直す'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View></View>;
}

function PremiumFeatureEntryCard({ number, title, active, designMode, chicPalette, onPress, styles }: { number: string; title: string; active: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; onPress: () => void; styles: any }) {
  const isMono = designMode !== 'chic';
  return <Pressable onPress={onPress} style={[styles.premiumEntryCard, active && styles.premiumEntryCardActive, isMono && styles.premiumEntryCardMinimal, designMode === 'dark' && styles.premiumEntryCardDark, designMode === 'chic' && styles.premiumEntryCardChic, designMode === 'chic' && chicPalette && { backgroundColor: active ? chicPalette.accentSoft : chicPalette.cardSurface, borderColor: active ? chicPalette.accent : chicPalette.border }]}>
    <Text style={[styles.premiumEntryNumber, active && styles.premiumEntryNumberActive, designMode === 'dark' && styles.premiumEntryNumberDark, designMode === 'chic' && chicPalette && { color: active ? chicPalette.accentStrong : chicPalette.textMuted }]}>{number}</Text>
    <Text numberOfLines={2} style={[styles.premiumEntryTitle, active && styles.premiumEntryTitleActive, designMode === 'dark' && styles.premiumEntryTitleDark, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{title}</Text>
  </Pressable>;
}

function PremiumFeatureDetail({ number, kind, title, description, designMode, chicPalette, styles }: { number: string; kind: PremiumPreviewKind; title: string; description: string; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any }) {
  const isMono = designMode !== 'chic';
  return <View style={[styles.premiumFeatureBlock, isMono && styles.premiumFeatureMinimal, designMode === 'dark' && styles.premiumFeatureDark, designMode === 'chic' && styles.premiumFeatureChic, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
    <View style={styles.premiumFeatureInner}>
      <View style={styles.premiumFeatureTop}><Text style={[styles.premiumFeatureNumber, designMode === 'minimal' && styles.premiumFeatureNumberMinimal, designMode === 'dark' && styles.premiumFeatureNumberDark, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{number}</Text><Text style={[styles.premiumFeatureLabel, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>Premium機能</Text></View>
      <PremiumMiniPreview kind={kind} designMode={designMode} styles={styles} />
      <View style={[styles.premiumFeatureTextPlate, isMono && styles.premiumFeatureTextMinimal, designMode === 'dark' && styles.premiumFeatureTextDark, designMode === 'chic' && styles.premiumFeatureTextChic, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}><Text style={[styles.premiumFeatureTitle, isMono && styles.premiumFeatureTitleMinimal, designMode === 'dark' && styles.premiumFeatureTitleDark, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{title}</Text><Text style={[styles.premiumFeatureDescription, isMono && styles.premiumFeatureDescriptionMinimal, designMode === 'dark' && styles.premiumFeatureDescriptionDark, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{description}</Text></View>
    </View>
  </View>;
}

export function PremiumModal({ visible, initialFeatureId, designMode, chicPalette, planTier, isDevelopment = false, onMockPlanTier, onClose, styles, helpers }: { visible: boolean; initialFeatureId: PremiumGuideFeatureId; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; isDevelopment?: boolean; onMockPlanTier?: (tier: PlanTier | null) => void; onClose: () => void; styles: any; helpers: any }) {
  const { getThemeTokens } = helpers;
  const theme = getThemeTokens(designMode);
  const designSurface = designMode === 'chic' && chicPalette ? { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border } : undefined;
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const accentStrong = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent;
  const surface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : theme.colors.surface;
  const surfaceSoft = designMode === 'chic' && chicPalette ? chicPalette.cardTint : theme.colors.secondarySurface;
  const primaryText = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : theme.colors.primaryText;
  const secondaryText = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText;
  const accentText = designMode === 'chic' && chicPalette ? chicPalette.onAccent : designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF';
  const initialIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === initialFeatureId));
  const [selectedFeatureId, setSelectedFeatureId] = useState<PremiumGuideFeatureId>(initialFeatureId);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'processing' | 'success' | 'unavailable'>('idle');
  useEffect(() => {
    if (!visible) return;
    setSelectedFeatureId(initialFeatureId);
    setPurchaseOpen(false);
    setPurchaseStatus('idle');
  }, [initialFeatureId, visible]);
  useEffect(() => {
    if (!visible) {
      setPurchaseOpen(false);
      setPurchaseStatus('idle');
    }
  }, [visible]);
  const selectedFeature = PREMIUM_GUIDE_FEATURES.find((feature) => feature.id === selectedFeatureId) ?? PREMIUM_GUIDE_FEATURES[initialIndex] ?? PREMIUM_GUIDE_FEATURES[0]!;
  const selectedIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === selectedFeature.id));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, styles.premiumModalSheet, { backgroundColor: theme.colors.screenBackground }, designSurface]} onPress={(event) => event.stopPropagation()}>
        <View style={styles.modalHandle} />
        <View style={styles.premiumCarouselHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.premiumCarouselBrand, { color: primaryText }]}>Rhythm Premium</Text>
            <Text style={[styles.premiumCarouselCopy, { color: secondaryText }]}>Rhythmが、あなたより少し先に動く。</Text>
            <Text style={[styles.premiumCarouselCopy, { color: secondaryText }, { marginTop: 5, fontSize: 10 }]}>{purchaseOpen ? '登録・購入の準備をしています。' : '無料版に加えて、記録・分析・デザイン・共有を広げます。'}</Text>
          </View>
          {purchaseOpen ? <Pressable style={[styles.premiumHeaderClose, { borderColor: accent }]} onPress={() => { setPurchaseOpen(false); setPurchaseStatus('idle'); }}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>戻る</Text></Pressable> : <Pressable style={[styles.premiumHeaderClose, { borderColor: accent }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>閉じる</Text></Pressable>}
        </View>
        {!purchaseOpen && <Pressable style={[styles.premiumCloseButton, { borderColor: accent, backgroundColor: surfaceSoft, marginHorizontal: 8, marginTop: 0, marginBottom: 8 }]} onPress={() => setPurchaseOpen(true)}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>{planTier === 'premium' ? 'Premiumの状態を確認' : 'Premiumに登録・購入する'}</Text></Pressable>}
        {purchaseOpen ? <ScrollView style={styles.premiumCarouselArea} contentContainerStyle={styles.premiumModalScroll} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: surface, borderColor: accent, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: primaryText, fontSize: 20, fontWeight: '900' }}>Premiumを始める</Text>
            <Text style={{ color: secondaryText, fontSize: 12, lineHeight: 19, marginTop: 8 }}>今日の記録、今月を振り返る、花柄1〜3、行動分析、詳細な履歴・検索、地図・共有などを利用できます。</Text>
            <View style={{ backgroundColor: surfaceSoft, borderRadius: 12, padding: 12, marginTop: 14 }}>
              <Text style={{ color: primaryText, fontSize: 12, fontWeight: '900' }}>App Store課金について</Text>
              <Text style={{ color: secondaryText, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Apple Developer登録後にStoreKitへ接続します。現在は画面と状態管理を確認するための開発用モックです。</Text>
            </View>
            {purchaseStatus === 'success' && <View style={{ borderWidth: 1, borderColor: accent, borderRadius: 12, padding: 12, marginTop: 14 }}><Text style={{ color: accentStrong, fontSize: 13, fontWeight: '900' }}>開発用Premiumを有効にしました</Text><Text style={{ color: secondaryText, fontSize: 11, marginTop: 4 }}>アプリを再起動すると環境設定へ戻ります。</Text></View>}
            {purchaseStatus === 'unavailable' && <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12, marginTop: 14 }}><Text style={{ color: primaryText, fontSize: 12, fontWeight: '900' }}>購入処理は準備中です</Text><Text style={{ color: secondaryText, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Apple Developer登録後にApp Storeの購入処理を接続できます。</Text></View>}
            <Pressable disabled={purchaseStatus === 'processing' || planTier === 'premium'} onPress={() => {
              if (isDevelopment && onMockPlanTier) {
                setPurchaseStatus('processing');
                onMockPlanTier('premium');
                setPurchaseStatus('success');
              } else {
                setPurchaseStatus('unavailable');
              }
            }} style={{ minHeight: 48, borderRadius: 13, backgroundColor: planTier === 'premium' ? surfaceSoft : accent, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}><Text style={{ color: planTier === 'premium' ? secondaryText : accentText, fontSize: 13, fontWeight: '900' }}>{planTier === 'premium' ? 'Premium有効中' : purchaseStatus === 'processing' ? '確認中…' : 'Premiumに登録する'}</Text></Pressable>
            {isDevelopment && onMockPlanTier && <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => { onMockPlanTier('free'); setPurchaseStatus('idle'); }} style={{ flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: secondaryText, fontSize: 11, fontWeight: '800' }}>無料版で確認</Text></Pressable>
              <Pressable onPress={() => { onMockPlanTier(null); setPurchaseStatus('idle'); }} style={{ flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: secondaryText, fontSize: 11, fontWeight: '800' }}>環境設定へ戻す</Text></Pressable>
            </View>}
          </View>
          <Pressable style={[styles.premiumCloseButton, { borderColor: accent, backgroundColor: surface }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>閉じる</Text></Pressable>
        </ScrollView> : <ScrollView style={styles.premiumCarouselArea} contentContainerStyle={styles.premiumModalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.premiumFeaturePicker}>
            {PREMIUM_GUIDE_FEATURES.map((feature, index) => <PremiumFeatureEntryCard key={feature.id} number={String(index + 1).padStart(2, '0')} title={feature.title} active={feature.id === selectedFeature.id} designMode={designMode} chicPalette={chicPalette} onPress={() => setSelectedFeatureId(feature.id)} styles={styles} />)}
          </View>
          <View style={styles.premiumFeatureStage}>
            <PremiumFeatureDetail number={String(selectedIndex + 1).padStart(2, '0')} kind={selectedFeature.kind} title={selectedFeature.title} description={selectedFeature.description} designMode={designMode} chicPalette={chicPalette} styles={styles} />
            {selectedFeature.id === 'month' && <View style={styles.premiumHistoryNote}><Text style={styles.premiumHistoryTitle}>月表示と過去の記録</Text><Text style={styles.premiumHistoryCopy}>7日を超えた予定や完了・集中・出発の記録も確認できます。</Text></View>}
          </View>
          <Pressable style={[styles.premiumCloseButton, { borderColor: accent, backgroundColor: surface }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: accentStrong }]}>Rhythmに戻る</Text></Pressable>
        </ScrollView>}
      </Pressable>
    </Pressable>
  </Modal>;
}
