import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ChicPattern, DesignMode } from '../theme';
import { PremiumGuideFeatureId } from '../premiumGuide';

type PremiumPreviewKind = PremiumGuideFeatureId;

const PREMIUM_GUIDE_FEATURES: Array<{ id: PremiumGuideFeatureId; kind: PremiumPreviewKind; title: string; description: string }> = [
  { id: 'calendar', kind: 'calendar', title: 'いつもの予定を、Rhythmにまとめる', description: '普段使っているカレンダーの予定も、Rhythmの予定表にまとめて表示。予定を見ながら、何時に準備して何時に出るかを考えられます。' },
  { id: 'route', kind: 'route', title: '間に合う出発プランを整える', description: '無料版でも地図は開けます。Premiumでは到着時刻から、準備・出発・余裕時間をひとつの流れとして逆算し、次にすることを分かりやすく表示します。' },
  { id: 'nudge', kind: 'nudge', title: '通知を見逃しても、そのままにしない', description: '1回の通知で動けなくても、Rhythmがもう一度確認。「見たけど後回し」を減らします。' },
  { id: 'time', kind: 'time', title: '予定と実際のズレが分かる', description: '準備や出発が、予定よりどのくらいズレているかを記録。感覚ではなく、最近の実際の行動から確認できます。' },
  { id: 'behavior', kind: 'behavior', title: '自分が動きやすい形を知る', description: '通知・集中・延長の記録から、最近の動き方を振り返れます。性格診断ではなく、実際の行動だけを使います。' },
  { id: 'month', kind: 'month', title: '7日より先まで見渡す', description: '無料版は今日から7日間。Premiumでは月単位で先の予定と、7日を超えた完了・集中・出発記録を確認できます。' },
  { id: 'recovery', kind: 'recovery', title: '遅れた時も、ここから立て直す', description: '遅れたことを責めるのではなく、今からできる行動を表示。予定が崩れても、すぐに戻れる形を考えます。' },
  { id: 'templates', kind: 'templates', title: '一度作った設定を、次からそのまま使う', description: '登録済みタスクを、カテゴリ・優先度・通知時刻・間に合うナビの時間設定と一緒に保存。次からはひな型を選び、内容を確認するだけで登録できます。' },
  { id: 'wish', kind: 'wish', title: '叶えたいことを、今月の行動へつなげる', description: '今月のテーマ、叶えたいこと、今日につながる行動をひとつの画面で整理。叶えた日や月の振り返りも残せます。' },
  { id: 'affirmation', kind: 'affirmation', title: '好きな言葉を、選んだ時間に届ける', description: '自分で書いたアファメーションを毎日指定時刻に通知。忙しい日も、自分の軸へ静かに戻れます。' },
  { id: 'photo_design', kind: 'photo_design', title: '好きな写真を、Rhythmの景色にする', description: '写真を背景またはトップ画像に設定。普段の画面構成はそのままに、自分らしい一枚を添えられます。' },
];

function PremiumMiniPreview({ kind, designMode, styles }: { kind: PremiumPreviewKind; designMode: DesignMode; styles: any }) {
  if (kind === 'calendar') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>予定表の表示イメージ</Text>{[['09:00', '朝会', '外部予定'], ['11:00', '資料提出', 'Rhythm'], ['14:00', '病院訪問', '外部予定'], ['18:30', 'ピラティス', '外部予定']].map(([time, title, source]) => <View key={`${time}-${title}`} style={styles.previewScheduleRow}><Text style={styles.previewTime}>{time}</Text><Text style={styles.previewScheduleTitle}>{title}</Text><Text style={[styles.previewSource, source === 'Rhythm' && styles.previewSourceRhythm]}>{source}</Text></View>)}<View style={styles.previewFlow}><Text style={styles.previewFlowText}>14:00 病院訪問</Text><Text style={styles.previewArrow}>↓</Text><Text style={styles.previewFlowButton}>出発を考える</Text></View></View>;
  if (kind === 'route') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>出発プランの表示イメージ</Text><View style={[styles.previewRouteMap, designMode === 'dark' && styles.previewRouteMapDark]}><Text style={styles.previewRouteMapTitle}>09:35 到着に間に合わせる</Text><Text style={styles.previewRouteMapPin}>↗</Text><Text style={styles.previewRouteMapPlace}>準備 08:35　出発 09:05</Text></View><View style={styles.previewRouteTiming}><View><Text style={styles.previewCompareLabel}>準備開始</Text><Text style={styles.previewCompareValue}>08:35</Text></View><Text style={styles.previewArrow}>→</Text><View><Text style={styles.previewCompareLabel}>出発</Text><Text style={styles.previewCompareValue}>09:05</Text></View><Text style={styles.previewArrow}>→</Text><View><Text style={styles.previewCompareLabel}>到着</Text><Text style={styles.previewCompareValue}>09:35</Text></View></View><Text style={styles.previewRouteCopy}>到着までに必要な行動時間を、ひとつの流れで整えます。</Text></View>;
  if (kind === 'nudge') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>通知の表示イメージ</Text>{[['09:00', '忘れてない？', '資料を送る'], ['09:05', 'そろそろ始められそう？', 'もう一度確認'], ['09:08', 'まだ終わってなければ', '今確認しよう']].map(([time, title, copy], index) => <View key={time} style={[styles.previewNotification, index > 0 && styles.previewNotificationLater]}><Text style={styles.previewNotificationTime}>{time}</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>{title}</Text><Text style={styles.previewNotificationCopy}>{copy}</Text></View></View>)}</View>;
  if (kind === 'time') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><Text style={styles.previewMetricLabel}>準備開始</Text><View style={styles.previewTimeCompare}><View><Text style={styles.previewCompareLabel}>予定</Text><Text style={styles.previewCompareValue}>12:10</Text></View><Text style={styles.previewCompareArrow}>→</Text><View><Text style={styles.previewCompareLabel}>実際</Text><Text style={styles.previewCompareValue}>12:24</Text></View></View><Text style={styles.previewMetricBig}>平均14分遅め</Text><Text style={styles.previewRecordCount}>記録 8回</Text></View>;
  if (kind === 'behavior') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><Text style={styles.previewMetricLabel}>最近の行動</Text><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>動き始め</Text><Text style={styles.previewInsightValue}>通知から平均17分で反応</Text></View><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>集中</Text><Text style={styles.previewInsightValue}>15分が比較的続きやすい傾向</Text></View><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>延長</Text><Text style={styles.previewInsightValue}>8回中5回はその後完了</Text></View></View>;
  if (kind === 'month') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>予定表の表示イメージ</Text><View style={styles.previewPlanCompare}><View style={styles.previewFreeWeek}><Text style={styles.previewCompareTag}>無料・今日から7日</Text><View style={styles.previewWeekRow}>{['6', '7', '8', '9', '10', '11', '12'].map((day) => <Text key={day} style={styles.previewWeekDay}>7/{day}</Text>)}</View></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewMonth}><Text style={styles.previewMonthTitle}>2026年 7月</Text><Text style={styles.previewMonthWeek}>日  月  火  水  木  金  土</Text><Text style={styles.previewMonthDays}>         1    2    3    4{`\n`} 5    6    7    8    9  10  11{`\n`}12  13  14  15  16  17  18{`\n`}19  20  21  22  23  24  25</Text></View></View></View>;
  if (kind === 'wish') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>叶えたいことの表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewCompareTag}>今月のテーマ</Text><Text style={styles.previewTemplateTitle}>自分のペースを整える</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>叶えたいこと</Text><Text style={styles.previewTemplateTitle}>週に1冊、本を読む</Text></View><Text style={styles.previewTemplateChoose}>✓</Text></View><Text style={styles.previewTemplateReady}>今日につながる行動　10分読む</Text></View>;
  if (kind === 'affirmation') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>通知の表示イメージ</Text><View style={styles.previewNotification}><Text style={styles.previewNotificationTime}>08:30</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>今日の言葉</Text><Text style={styles.previewNotificationCopy}>私は、自分のペースで進める</Text></View></View><View style={[styles.previewNotification, styles.previewNotificationLater]}><Text style={styles.previewNotificationTime}>毎日</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>自分で書いた言葉</Text><Text style={styles.previewNotificationCopy}>好きな時間に届ける</Text></View></View></View>;
  if (kind === 'photo_design') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>写真デザインの表示イメージ</Text><View style={styles.previewRouteMap}><Text style={styles.previewRouteMapTitle}>好きな写真</Text><Text style={styles.previewRouteMapPin}>▧</Text><Text style={styles.previewRouteMapPlace}>背景にする　/　トップにする</Text></View><View style={styles.previewRecoveryGrid}>{['写真を選ぶ', '背景にする', 'トップにする', 'いつものUIはそのまま'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View></View>;
  if (kind === 'templates') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text><Text style={styles.previewTemplateMeta}>予定　優先度 高　通知 09:00</Text><Text style={styles.previewTemplateMeta}>準備30分　移動40分　余裕15分</Text><Text style={styles.previewTemplateSave}>設定ごとひな型に保存</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>マイひな型</Text><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text></View><Text style={styles.previewTemplateChoose}>選ぶ ›</Text></View><Text style={styles.previewTemplateReady}>設定済みでフォームへ反映</Text></View>;
  return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>立て直しの表示イメージ</Text><View style={styles.previewDanger}><Text style={styles.previewDangerText}>予定どおりは厳しい</Text></View><View style={styles.previewRecoveryGrid}>{['今から出発', '到着予定を変更', '遅れる連絡', '予定を組み直す'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View></View>;
}

function PremiumFeatureEntryCard({ number, title, active, designMode, chicPattern, onPress, components, styles }: { number: string; title: string; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; onPress: () => void; components: any; styles: any }) {
  const { ChicPatternDecor, isCheckChicPattern } = components;
  const isMono = designMode !== 'chic';
  return <Pressable onPress={onPress} style={[styles.premiumEntryCard, active && styles.premiumEntryCardActive, isMono && styles.premiumEntryCardMinimal, designMode === 'dark' && styles.premiumEntryCardDark, designMode === 'chic' && styles.premiumEntryCardChic]}>
    {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <View pointerEvents="none" style={styles.premiumEntryPattern}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" density="compact" /></View>}
    <Text style={[styles.premiumEntryNumber, active && styles.premiumEntryNumberActive, designMode === 'dark' && styles.premiumEntryNumberDark]}>{number}</Text>
    <Text numberOfLines={2} style={[styles.premiumEntryTitle, active && styles.premiumEntryTitleActive, designMode === 'dark' && styles.premiumEntryTitleDark]}>{title}</Text>
  </Pressable>;
}

function PremiumFeatureDetail({ number, kind, title, description, designMode, chicPattern, components, styles }: { number: string; kind: PremiumPreviewKind; title: string; description: string; designMode: DesignMode; chicPattern: ChicPattern; components: any; styles: any }) {
  const { ChicPatternDecor, isCheckChicPattern } = components;
  const isMono = designMode !== 'chic';
  return <View style={[styles.premiumFeatureBlock, isMono && styles.premiumFeatureMinimal, designMode === 'dark' && styles.premiumFeatureDark, designMode === 'chic' && styles.premiumFeatureChic, ]}>
    {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
    <View style={styles.premiumFeatureInner}>
      <View style={styles.premiumFeatureTop}><Text style={[styles.premiumFeatureNumber, designMode === 'minimal' && styles.premiumFeatureNumberMinimal, designMode === 'dark' && styles.premiumFeatureNumberDark]}>{number}</Text><Text style={styles.premiumFeatureLabel}>Premium機能</Text></View>
      <PremiumMiniPreview kind={kind} designMode={designMode} styles={styles} />
      <View style={[styles.premiumFeatureTextPlate, isMono && styles.premiumFeatureTextMinimal, designMode === 'dark' && styles.premiumFeatureTextDark, designMode === 'chic' && styles.premiumFeatureTextChic]}><Text style={[styles.premiumFeatureTitle, isMono && styles.premiumFeatureTitleMinimal, designMode === 'dark' && styles.premiumFeatureTitleDark]}>{title}</Text><Text style={[styles.premiumFeatureDescription, isMono && styles.premiumFeatureDescriptionMinimal, designMode === 'dark' && styles.premiumFeatureDescriptionDark]}>{description}</Text></View>
    </View>
  </View>;
}

export function PremiumModal({ visible, initialFeatureId, designMode, chicPattern, onClose, styles, helpers, components }: { visible: boolean; initialFeatureId: PremiumGuideFeatureId; designMode: DesignMode; chicPattern: ChicPattern; onClose: () => void; styles: any; helpers: any; components: any }) {
  const { getThemeTokens } = helpers;
  const theme = getThemeTokens(designMode);
  const initialIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === initialFeatureId));
  const [selectedFeatureId, setSelectedFeatureId] = useState<PremiumGuideFeatureId>(initialFeatureId);
  useEffect(() => {
    if (!visible) return;
    setSelectedFeatureId(initialFeatureId);
  }, [initialFeatureId, visible]);
  const selectedFeature = PREMIUM_GUIDE_FEATURES.find((feature) => feature.id === selectedFeatureId) ?? PREMIUM_GUIDE_FEATURES[initialIndex] ?? PREMIUM_GUIDE_FEATURES[0]!;
  const selectedIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === selectedFeature.id));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, styles.premiumModalSheet, { backgroundColor: theme.colors.screenBackground }]} onPress={(event) => event.stopPropagation()}>
        <View style={styles.modalHandle} />
        <View style={styles.premiumCarouselHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.premiumCarouselBrand, designMode === 'dark' && styles.darkText]}>Rhythm Premium</Text>
            <Text style={[styles.premiumCarouselCopy, designMode === 'dark' && styles.darkSubText]}>Rhythmが、あなたより少し先に動く。</Text>
            <Text style={[styles.premiumCarouselCopy, designMode === 'dark' && styles.darkSubText, { marginTop: 5, fontSize: 10 }]}>無料版は地図を開く。Premiumは、登録した時間をもとに間に合う行動時間まで整える。</Text>
          </View>
          <Pressable style={[styles.premiumHeaderClose, { borderColor: theme.colors.primaryAccent }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: theme.colors.primaryAccent }]}>閉じる</Text></Pressable>
        </View>
        <ScrollView style={styles.premiumCarouselArea} contentContainerStyle={styles.premiumModalScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.premiumFeaturePicker}>
          {PREMIUM_GUIDE_FEATURES.map((feature, index) => <PremiumFeatureEntryCard key={feature.id} number={String(index + 1).padStart(2, '0')} title={feature.title} active={feature.id === selectedFeature.id} designMode={designMode} chicPattern={chicPattern} onPress={() => setSelectedFeatureId(feature.id)} components={components} styles={styles} />)}
        </View>
        <View style={styles.premiumFeatureStage}>
          <PremiumFeatureDetail number={String(selectedIndex + 1).padStart(2, '0')} kind={selectedFeature.kind} title={selectedFeature.title} description={selectedFeature.description} designMode={designMode} chicPattern={chicPattern} components={components} styles={styles} />
          {selectedFeature.id === 'month' && <View style={styles.premiumHistoryNote}><Text style={styles.premiumHistoryTitle}>過去の記録も、あとから振り返れる</Text><Text style={styles.premiumHistoryCopy}>7日を超えた完了記録や、集中・出発の記録も確認できます。</Text></View>}
        </View>
        <Pressable style={[styles.premiumCloseButton, { borderColor: theme.colors.primaryAccent }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: theme.colors.primaryAccent }]}>Rhythmに戻る</Text></Pressable>
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
