import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChicPattern, ChicThemePalette, getThemeTokens } from '../theme';
import { hasPremiumAccess, isWithinFreeHistory, PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { BehaviorEvent } from '../behaviorEvents';
import { DepartureCheckIn } from '../departureCheckIn';
import { FocusSession } from '../focusSession';
import { RecoveryRecord } from '../recovery';
import { CalendarMarks, DeparturePlan, MonthlyReflectionCard, MonthlyReview, ReflectionCardPalette, ReflectionCardTemplate, Task, ThemeMode, WishMonthMap } from '../types';
import { normalizeMonthlyReview } from '../features/wish/wishUtils';
import { persistPhotoUri } from '../features/photo/persistentPhoto';

export type ReflectionCardModel = {
  monthKey: string;
  monthLabel: string;
  photos: string[];
  template: ReflectionCardTemplate;
  palette: ReflectionCardPalette;
  phrase: string;
  bestMemory: string;
};

const reflectionCardPalettes: Record<ReflectionCardPalette, { background: string; surface: string; accent: string; text: string; muted: string }> = {
  lavender: { background: '#F7F8FF', surface: '#FFFFFF', accent: '#5B82E8', text: '#182B4A', muted: '#71809A' },
  blue: { background: '#F3F8FD', surface: '#FFFFFF', accent: '#3D8AC7', text: '#17344B', muted: '#68869C' },
  peach: { background: '#FFF7F2', surface: '#FFFFFF', accent: '#D67C62', text: '#4A2E28', muted: '#96766D' },
  green: { background: '#F2FAF5', surface: '#FFFFFF', accent: '#4D9372', text: '#1F4032', muted: '#6E8A7C' },
};
const reflectionTemplateLabels: Record<ReflectionCardTemplate, string> = { gallery: 'Magazine', film: 'Collage', scrapbook: 'Memory Scrapbook' };
const reflectionPaletteLabels: Record<ReflectionCardPalette, string> = { lavender: 'Lavender', blue: 'Blue', peach: 'Peach', green: 'Green' };

function normalizeReflectionCard(value: unknown, monthKey: string): MonthlyReflectionCard | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Partial<MonthlyReflectionCard> & { uri?: unknown; monthlyWord?: unknown; bestTitle?: unknown; photoCount?: unknown; generatedAt?: unknown };
  // Older builds did not persist card settings. If a legacy card is present,
  // read its image URI as a photo reference but never write that generated image back.
  const photoIds = Array.isArray(raw.photoIds)
    ? raw.photoIds.filter((photoId): photoId is string => typeof photoId === 'string' && photoId.length > 0)
    : typeof raw.uri === 'string' && raw.uri.length > 0 ? [raw.uri] : [];
  if (photoIds.length === 0) return undefined;
  const template: ReflectionCardTemplate = raw.template === 'film' || raw.template === 'scrapbook' ? raw.template : 'gallery';
  const palette: ReflectionCardPalette = raw.palette === 'blue' || raw.palette === 'peach' || raw.palette === 'green' ? raw.palette : 'lavender';
  return {
    monthKey: typeof raw.monthKey === 'string' && raw.monthKey ? raw.monthKey : monthKey,
    photoIds,
    phrase: typeof raw.phrase === 'string' ? raw.phrase : typeof raw.monthlyWord === 'string' ? raw.monthlyWord : '',
    bestMemory: typeof raw.bestMemory === 'string' ? raw.bestMemory : typeof raw.bestTitle === 'string' ? raw.bestTitle : '',
    template,
    palette,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date(0).toISOString(),
  };
}

function templatePhotoStyle(template: ReflectionCardTemplate, count: number, index: number): { width: `${number}%`; height: number } {
  if (template === 'gallery') {
    if (index === 0) return { width: '100%', height: count === 1 ? 246 : 214 };
    return { width: count >= 4 ? '31%' : '48%', height: 68 };
  }
  if (template === 'film') {
    if (count === 1) return { width: '100%', height: 230 };
    if (count === 2) return { width: '48%', height: 178 };
    if (count === 3 && index === 0) return { width: '100%', height: 136 };
    if (count === 3) return { width: '48%', height: 88 };
    if (count === 4) return { width: '48%', height: 104 };
    if (index === 0) return { width: '100%', height: 124 };
    return { width: '31%', height: 76 };
  }
  if (count === 1) return { width: '100%', height: 208 };
  if (count === 2) return { width: '48%', height: 166 };
  if (count === 3 && index === 0) return { width: '100%', height: 158 };
  if (count === 3) return { width: '48%', height: 84 };
  if (count === 4) return { width: '48%', height: 96 };
  if (index === 0) return { width: '62%', height: 138 };
  return { width: '31%', height: 72 };
}

const reflectionStyles = StyleSheet.create({
  cardShot: { width: 300, height: 533, borderRadius: 18, borderWidth: 2, padding: 8 },
  cardInner: { flex: 1, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 16, alignItems: 'center' },
  cardKicker: { fontSize: 19, lineHeight: 22, marginTop: 1 },
  cardTitle: { fontSize: 19, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  cardRule: { width: '72%', height: 1, opacity: 0.7, marginTop: 8 },
  cardWord: { fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 13, minHeight: 22 },
  cardSection: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  photoGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 7 },
  cardPhoto: { width: '100%', height: '100%', backgroundColor: '#E8ECF0' },
  magazineFrame: { overflow: 'hidden', borderRadius: 4, backgroundColor: '#E8ECF0' },
  magazineStrip: { width: '100%', flexDirection: 'row', gap: 6, marginTop: 7 },
  collageFrame: { padding: 4, backgroundColor: '#FFFFFF', borderWidth: 1, overflow: 'hidden' },
  filmStrip: { width: '100%', flexDirection: 'row', gap: 5, paddingHorizontal: 3, paddingVertical: 5, backgroundColor: '#252525', marginBottom: 7 },
  filmPerforation: { width: 5, height: 4, borderRadius: 2, backgroundColor: '#F5F5F5', opacity: 0.9 },
  scrapbookFrame: { padding: 4, backgroundColor: '#FFFFFF', borderWidth: 1, overflow: 'hidden' },
  scrapbookHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  scrapbookStamp: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4, transform: [{ rotate: '3deg' }] },
  scrapbookNotes: { width: '100%', flexDirection: 'row', gap: 6, marginTop: 9 },
  scrapbookNote: { flex: 1, borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 6 },
  bestBlock: { width: '100%', borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  collageMemo: { width: '100%', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, marginTop: 9, transform: [{ rotate: '-1deg' }] },
  collageMemoLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  collageMemoText: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  bestLabel: { fontSize: 9, fontWeight: '900' },
  bestTitle: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  cardFooter: { fontSize: 9, fontWeight: '800', marginTop: 'auto' },
  controlLabel: { fontSize: 10, fontWeight: '900', marginTop: 9, marginBottom: 4 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choiceChip: { minHeight: 30, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  paletteDot: { width: 10, height: 10, borderRadius: 5 },
  savedCardButton: { alignItems: 'center', paddingVertical: 5, marginBottom: 6 },
  savedCardButtonText: { color: '#6E6675', fontSize: 10, fontWeight: '800' },
});

export function MonthlyReflectionCardView({ model, cardRef, onReady }: { model: ReflectionCardModel; cardRef: React.RefObject<View | null>; onReady: () => void }) {
  const palette = reflectionCardPalettes[model.palette];
  const isMagazine = model.template === 'gallery';
  const isCollage = model.template === 'film';
  const isScrapbook = model.template === 'scrapbook';
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const [laidOut, setLaidOut] = useState(false);
  useEffect(() => {
    if (model.photos.length > 0 && laidOut && loaded.size >= model.photos.length) onReady();
  }, [laidOut, loaded, model.photos.length, onReady]);
  const markLoaded = (index: number) => setLoaded((current) => new Set(current).add(index));
  const photo = (uri: string, index: number) => {
    const photoStyle = templatePhotoStyle(model.template, model.photos.length, index);
    const rotation = isCollage ? (index % 3 === 0 ? '-1.5deg' : index % 3 === 1 ? '1.2deg' : '-0.7deg') : isScrapbook ? (index % 2 === 0 ? '-2deg' : '2deg') : '0deg';
    const frameStyle = isMagazine ? reflectionStyles.magazineFrame : isCollage ? reflectionStyles.collageFrame : reflectionStyles.scrapbookFrame;
    return <View key={`${uri}-${index}`} style={[frameStyle, photoStyle, { transform: [{ rotate: rotation }] }, isCollage && { borderColor: palette.accent }, isScrapbook && { borderColor: palette.accent }]}><Image source={{ uri }} resizeMode={isMagazine ? 'cover' : 'cover'} onLoadEnd={() => markLoaded(index)} onError={() => markLoaded(index)} style={reflectionStyles.cardPhoto} /></View>;
  };
  const magazinePhotos = model.photos.map((uri, index) => photo(uri, index));
  const collagePhotos = model.photos.map((uri, index) => photo(uri, index));
  const scrapbookPhotos = model.photos.map((uri, index) => photo(uri, index));
  return <View ref={cardRef} collapsable={false} onLayout={() => setLaidOut(true)} style={[reflectionStyles.cardShot, { backgroundColor: palette.background, borderColor: palette.accent }]}>
    <View collapsable={false} style={[reflectionStyles.cardInner, { backgroundColor: palette.surface }]}>
      {isMagazine ? <>
        <Text style={[reflectionStyles.cardKicker, { color: palette.accent, fontSize: 10, letterSpacing: 1.8 }]}>RHYTHM / MONTHLY EDITION</Text>
        <Text style={[reflectionStyles.cardTitle, { color: palette.text, fontSize: 25, lineHeight: 29, marginTop: 8 }]}>{model.monthLabel}</Text>
        <View style={[reflectionStyles.cardRule, { backgroundColor: palette.accent, width: '88%', marginTop: 10 }]} />
        <Text numberOfLines={2} style={[reflectionStyles.cardWord, { color: palette.text, fontSize: 17, marginTop: 12 }]}>{model.phrase || 'よく頑張ったね'}</Text>
        <Text style={[reflectionStyles.cardSection, { color: palette.accent, alignSelf: 'flex-start', marginTop: 14 }]}>今月の記録　／　{model.photos.length} PHOTOS</Text>
        <View style={reflectionStyles.photoGrid}>{magazinePhotos.slice(0, 1)}</View>
        {model.photos.length > 1 && <View style={reflectionStyles.magazineStrip}>{magazinePhotos.slice(1)}</View>}
        {model.bestMemory ? <View style={[reflectionStyles.bestBlock, { backgroundColor: palette.background, borderColor: palette.accent, borderRadius: 2 }]}><Text style={[reflectionStyles.bestLabel, { color: palette.accent, letterSpacing: 1 }]}>EDITOR'S PICK / 今月のベスト</Text><Text numberOfLines={2} style={[reflectionStyles.bestTitle, { color: palette.text, fontSize: 13 }]}>{model.bestMemory}</Text></View> : null}
      </> : isCollage ? <>
        <View style={[reflectionStyles.filmStrip, { backgroundColor: palette.accent }]}>{Array.from({ length: 9 }, (_, index) => <View key={index} style={reflectionStyles.filmPerforation} />)}</View>
        <Text style={[reflectionStyles.cardTitle, { color: palette.text, fontSize: 20, alignSelf: 'flex-start' }]}>{model.monthLabel}のコラージュ</Text>
        <Text numberOfLines={2} style={[reflectionStyles.cardWord, { color: palette.text, fontSize: 14, alignSelf: 'flex-start', textAlign: 'left', marginTop: 6 }]}>{model.phrase || 'よく頑張ったね'}</Text>
        <View style={[reflectionStyles.photoGrid, { marginTop: 13 }]}>{collagePhotos}</View>
        {model.bestMemory ? <View style={[reflectionStyles.collageMemo, { backgroundColor: palette.background, borderColor: palette.accent }]}><Text style={[reflectionStyles.collageMemoLabel, { color: palette.accent }]}>MEMO / 今月のベスト</Text><Text numberOfLines={2} style={[reflectionStyles.collageMemoText, { color: palette.text }]}>{model.bestMemory}</Text></View> : null}
      </> : <>
        <View style={reflectionStyles.scrapbookHeader}><Text style={[reflectionStyles.cardKicker, { color: palette.accent, fontSize: 11, letterSpacing: 1.2 }]}>MEMORY SCRAPBOOK</Text><View style={[reflectionStyles.scrapbookStamp, { borderColor: palette.accent }]}><Text style={{ color: palette.accent, fontSize: 9, fontWeight: '900' }}>KEEP</Text></View></View>
        <Text style={[reflectionStyles.cardTitle, { color: palette.text, fontSize: 20, alignSelf: 'flex-start' }]}>{model.monthLabel}</Text>
        <View style={[reflectionStyles.cardRule, { backgroundColor: palette.accent, width: '100%', marginTop: 6 }]} />
        <View style={[reflectionStyles.photoGrid, { marginTop: 15 }]}>{scrapbookPhotos}</View>
        <View style={reflectionStyles.scrapbookNotes}><View style={[reflectionStyles.scrapbookNote, { backgroundColor: palette.background, borderColor: palette.accent }]}><Text style={[reflectionStyles.bestLabel, { color: palette.accent }]}>今月の言葉</Text><Text numberOfLines={3} style={[reflectionStyles.bestTitle, { color: palette.text }]}>{model.phrase || 'よく頑張ったね'}</Text></View>{model.bestMemory ? <View style={[reflectionStyles.scrapbookNote, { backgroundColor: palette.background, borderColor: palette.accent }]}><Text style={[reflectionStyles.bestLabel, { color: palette.accent }]}>ベスト記録</Text><Text numberOfLines={3} style={[reflectionStyles.bestTitle, { color: palette.text }]}>{model.bestMemory}</Text></View> : null}</View>
      </>}
      <Text style={[reflectionStyles.cardFooter, { color: palette.muted }]}>Rhythm　♡</Text>
    </View>
  </View>;
}

export function HistoryScreen({ tasks, wishMonths, calendarMarks, onSetCalendarMark, recoveryHistory, focusSessions, departureCheckIns, departurePlans, behaviorEvents, completionIcon, designMode, chicPattern, chicPalette, planTier, onPremium, onSaveTemplate, onRestore, onSaveDailyReview, onSaveMonthlyReflectionCard, onUpdateReview, onDeleteReview, styles, helpers, components, previewMode = false, previewSearchQuery, previewJournal = false, openDailyReview = false, initialDate, dailyReviewOnly = false }: { tasks: Task[]; wishMonths: WishMonthMap; calendarMarks: CalendarMarks; onSetCalendarMark: (date: string, mark?: string) => void; recoveryHistory: RecoveryRecord[]; focusSessions: FocusSession[]; departureCheckIns: DepartureCheckIn[]; departurePlans: DeparturePlan[]; behaviorEvents: BehaviorEvent[]; completionIcon: string; designMode: ThemeMode; chicPattern: ChicPattern; chicPalette?: ChicThemePalette; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onSaveTemplate: (task: Task) => void; onRestore: (id: string) => void; onSaveDailyReview: (monthKey: string, draft: MonthlyReview) => void; onSaveMonthlyReflectionCard: (monthKey: string, card: MonthlyReflectionCard) => void; onUpdateReview: (monthKey: string, reviewKey: string, updates: Partial<MonthlyReview>) => void; onDeleteReview: (monthKey: string, reviewKey: string) => void; styles: any; helpers: any; components: any; previewMode?: boolean; previewSearchQuery?: string; previewJournal?: boolean; openDailyReview?: boolean; initialDate?: string; dailyReviewOnly?: boolean }) {
  const { dateKey, formatLiveTime, getThemeTokens } = helpers;
  const { AchievementVessel, CalendarMarkPicker } = components;
  const now = new Date();
  const isDark = designMode === 'dark';
  const guideTheme = getThemeTokens(designMode);
  const premiumGuideCard = designMode === 'chic' && chicPalette
    ? { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, borderWidth: 1 }
    : { backgroundColor: guideTheme.colors.surface, borderColor: guideTheme.colors.border, borderWidth: 1 };
  const premiumGuideTitle = { color: designMode === 'chic' && chicPalette ? chicPalette.textPrimary : guideTheme.colors.primaryText };
  const premiumGuideCopy = { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : guideTheme.colors.secondaryText };
  const premiumGuideAccent = { color: designMode === 'chic' && chicPalette ? chicPalette.accent : guideTheme.colors.primaryAccent };
  const journalTheme = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, secondarySurface: chicPalette.surfaceSubtle, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, border: chicPalette.border, onAccent: chicPalette.onAccent }
    : { surface: guideTheme.colors.surface, secondarySurface: guideTheme.colors.secondarySurface, text: guideTheme.colors.primaryText, muted: guideTheme.colors.secondaryText, accent: guideTheme.colors.primaryAccent, border: guideTheme.colors.border, onAccent: designMode === 'dark' ? guideTheme.colors.screenBackground : '#FFFFFF' };
  const historyAccent = designMode === 'chic' && chicPalette ? chicPalette.accent : guideTheme.colors.primaryAccent;
  const historyAccentStrong = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : guideTheme.colors.primaryAccent;
  const historyAccentSoft = designMode === 'chic' && chicPalette ? chicPalette.accentSoft : guideTheme.colors.softAccent;
  const historyText = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : guideTheme.colors.primaryText;
  const historyMuted = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : guideTheme.colors.secondaryText;
  const historySurface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : guideTheme.colors.surface;
  const historyBorder = designMode === 'chic' && chicPalette ? chicPalette.border : guideTheme.colors.border;
  const [selectedKey, setSelectedKey] = useState(dateKey(now));
  const [hasSelectedDate, setHasSelectedDate] = useState(previewMode);
  const [historyMonthDate, setHistoryMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [historySearch, setHistorySearch] = useState(previewSearchQuery ?? '');
  const [searchQuery, setSearchQuery] = useState(previewSearchQuery ?? '');
  const [searchResultsOpen, setSearchResultsOpen] = useState(Boolean(previewSearchQuery));
  const year = historyMonthDate.getFullYear();
  const month = historyMonthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const premiumHistory = hasPremiumAccess(planTier, 'full_history');
  const [selectedReview, setSelectedReview] = useState<MonthlyReview | null>(null);
  const [selectedReviewPhotoIndex, setSelectedReviewPhotoIndex] = useState(0);
  const [editingReview, setEditingReview] = useState<{ monthKey: string; reviewKey: string; review: MonthlyReview } | null>(null);
  const [reviewEditNote, setReviewEditNote] = useState('');
  const [reviewEditMemo, setReviewEditMemo] = useState('');
  const [journalDraft, setJournalDraft] = useState<MonthlyReview>({ date: dateKey(now), photos: [], photo: '', shortNote: '', memo: '', satisfaction: 0 });
  const [journalEditing, setJournalEditing] = useState(false);
  const [journalSaveMessage, setJournalSaveMessage] = useState('');
  const [monthlyCardPhotoCount, setMonthlyCardPhotoCount] = useState(0);
  const [monthlyCardModel, setMonthlyCardModel] = useState<ReflectionCardModel>();
  const [monthlyEditorOpen, setMonthlyEditorOpen] = useState(false);
  const [monthlyCardGenerating, setMonthlyCardGenerating] = useState(false);
  const [monthlyCardReady, setMonthlyCardReady] = useState(false);
  const [monthlyCardTemplate, setMonthlyCardTemplate] = useState<ReflectionCardTemplate>('gallery');
  const [monthlyCardPalette, setMonthlyCardPalette] = useState<ReflectionCardPalette>('lavender');
  const [monthlyWord, setMonthlyWord] = useState('');
  const [bestMemory, setBestMemory] = useState('');
  const monthlyCardRef = useRef<View>(null);
  const closeMonthlyCard = () => {
    setMonthlyCardModel(undefined);
    setMonthlyCardPhotoCount(0);
    setMonthlyCardGenerating(false);
    setMonthlyCardReady(false);
  };
  const historyTasks = premiumHistory ? tasks : tasks.filter((task) => task.completedAt && isWithinFreeHistory(task.completedAt, now));
  const completedByDay = historyTasks.reduce<Record<string, Task[]>>((result, task) => {
    if (!task.completedAt) return result;
    const key = dateKey(task.completedAt);
    result[key] = [...(result[key] ?? []), task];
    return result;
  }, {});
  const selectedTasks = !premiumHistory ? historyTasks.filter((task) => task.done && task.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) : searchQuery.trim() ? historyTasks.filter((task) => task.done && task.completedAt && task.title.toLowerCase().includes(searchQuery.trim().toLowerCase())).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) : completedByDay[selectedKey] ?? [];
  const updateHistorySearch = (value: string) => {
    setHistorySearch(value);
  };
  useEffect(() => {
    if (searchResultsOpen) setSearchQuery(historySearch.trim());
  }, [searchResultsOpen]);

  useEffect(() => {
    if (!historySearch.trim() && !searchResultsOpen) setSearchQuery('');
  }, [historySearch, searchResultsOpen]);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  useEffect(() => {
    const savedCard = normalizeReflectionCard(wishMonths[monthPrefix]?.reflectionCard, monthPrefix);
    setMonthlyCardTemplate(savedCard?.template ?? 'gallery');
    setMonthlyCardPalette(savedCard?.palette ?? 'lavender');
    setMonthlyWord(savedCard?.phrase ?? '');
    setBestMemory(savedCard?.bestMemory ?? '');
  }, [monthPrefix, wishMonths]);
  const moveHistoryMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setHistoryMonthDate(next);
    setSelectedKey(dateKey(next));
    setHasSelectedDate(false);
  };
  const calendarTasks = premiumHistory ? tasks : tasks.filter((task) => task.completedAt && dateKey(task.completedAt).startsWith(monthPrefix));
  const calendarCompletedByDay = calendarTasks.reduce<Record<string, Task[]>>((result, task) => {
    if (!task.completedAt) return result;
    const key = dateKey(task.completedAt);
    result[key] = [...(result[key] ?? []), task];
    return result;
  }, {});
  const reviewEntries = Object.entries(wishMonths).flatMap(([monthKey, monthState]) => {
    const reviews = monthState.reviews?.length ? monthState.reviews : (monthState.review && (monthState.review.photo || monthState.review.date || monthState.review.shortNote || monthState.review.memo || monthState.review.satisfaction) ? [monthState.review] : []);
    return reviews.map((review) => ({ monthKey, review, reviewKey: review.id ?? `${review.date ?? ''}|${review.shortNote ?? ''}|${review.memo ?? ''}|${review.satisfaction ?? 0}` }));
  }).filter((entry) => premiumHistory || entry.monthKey === monthPrefix);
  const reviewsByDay = reviewEntries.reduce<Record<string, MonthlyReview[]>>((result, entry) => {
    if (!entry.review.date) return result;
    result[entry.review.date] = [...(result[entry.review.date] ?? []), entry.review];
    return result;
  }, {});
  const completedWishesByDay = Object.values(wishMonths).flatMap((monthState) => monthState.wishes)
    .filter((wish) => wish.completed && wish.completedAt)
    .reduce<Record<string, Array<{ id: string; title: string }>>>((result, wish) => {
      const key = dateKey(wish.completedAt!);
      result[key] = [...(result[key] ?? []), { id: wish.id, title: wish.title }];
      return result;
    }, {});
  const departurePlansByDay = departurePlans.reduce<Record<string, DeparturePlan[]>>((result, plan) => {
    result[plan.date] = [...(result[plan.date] ?? []), plan];
    return result;
  }, {});
  const activityDays = new Set<string>([
    ...Object.keys(calendarCompletedByDay).filter((key) => (calendarCompletedByDay[key]?.length ?? 0) > 0),
    ...focusSessions.map((session) => dateKey(session.completedAt)),
    ...departureCheckIns.filter((record) => record.onTime).map((record) => record.date),
    ...Object.keys(reviewsByDay),
    ...Object.keys(completedWishesByDay),
  ]);
  const hasSevenDayStreak = (key: string) => {
    const target = new Date(`${key}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(target);
      date.setDate(target.getDate() - index);
      return activityDays.has(dateKey(date));
    }).every(Boolean);
  };
  const autoMarkForDay = (key: string) => {
    if ((reviewsByDay[key] ?? []).some((review) => Boolean(review.photo))) return '📸';
    if (hasSevenDayStreak(key)) return '🎉';
    if (departureCheckIns.some((record) => record.date === key && record.onTime)) return '🚶';
    if (focusSessions.some((session) => dateKey(session.completedAt) === key)) return '🎯';
    if ((completedWishesByDay[key] ?? []).length > 0) return '🌟';
    if ((departurePlansByDay[key] ?? []).length > 0) return '↗';
    return undefined;
  };
  const selectedReviewEntry = selectedReview ? reviewEntries.find((entry) => entry.review === selectedReview) : undefined;
  const selectedDayReviewEntry = reviewEntries.find((entry) => entry.review.date === selectedKey);
  const monthEntries = Object.entries(calendarCompletedByDay).filter(([key]) => key.startsWith(monthPrefix));
  const monthlyCount = monthEntries.reduce((sum, [, items]) => sum + items.length, 0);
  const activeDays = monthEntries.length;
  const bestDayCount = monthEntries.reduce((best, [, items]) => Math.max(best, items.length), 0);
  const monthlyFocusSessions = focusSessions.filter((session) => dateKey(session.completedAt).startsWith(monthPrefix));
  const monthlyFocusMinutes = monthlyFocusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const visibleRecoveryHistory = premiumHistory ? recoveryHistory : recoveryHistory.filter((record) => isWithinFreeHistory(record.occurredAt, now));
  const visibleFocusSessions = premiumHistory ? focusSessions : focusSessions.filter((session) => isWithinFreeHistory(session.completedAt, now));
  const visibleDepartureCheckIns = departureCheckIns.filter((record) => record.date.startsWith(monthPrefix));
  const visibleNotificationEvents = (premiumHistory ? behaviorEvents : behaviorEvents.filter((event) => isWithinFreeHistory(event.occurredAt, now))).filter((event) => event.type === 'notification_action').slice(0, 8);
  const departureBehaviorDetails = Object.values(behaviorEvents
    .filter((event) => event.type === 'departure_preparation_started' || event.type === 'departure_started')
    .filter((event) => (event.departurePlanDate ?? dateKey(event.occurredAt)).startsWith(monthPrefix))
    .reduce<Record<string, { title: string; date?: string; preparation?: BehaviorEvent; departure?: BehaviorEvent }>>((result, event) => {
      const key = `${event.departurePlanId ?? event.departurePlanTitleSnapshot ?? 'plan'}:${event.departurePlanDate ?? dateKey(event.occurredAt)}`;
      const current = result[key] ?? { title: event.departurePlanTitleSnapshot ?? '出発予定', date: event.departurePlanDate };
      if (event.type === 'departure_preparation_started') current.preparation = event;
      if (event.type === 'departure_started') current.departure = event;
      result[key] = current;
      return result;
    }, {})).slice(0, 8);
  const selectedDayReview = reviewsByDay[selectedKey]?.[0];
  const selectedJournalPhotos = [...new Set([...(journalDraft.photos ?? []), journalDraft.photo ?? ''].filter(Boolean))];
  const monthlyPhotoIds = [...new Set(reviewEntries.filter((entry) => entry.monthKey === monthPrefix).flatMap((entry) => [...new Set([...(entry.review.photos ?? []), entry.review.photo ?? ''].filter(Boolean))]))];
  // Photo logs remain available to every plan. The recap card, rather than the
  // underlying journal, is limited by plan to keep exports lightweight.
  const maxJournalPhotos = planTier === 'premium' ? 5 : 2;
  const monthlyCardLimit = planTier === 'premium' ? 5 : 2;
  const loadJournalDraft = (key: string) => {
    const existing = reviewsByDay[key]?.[0];
    setJournalDraft(existing ? normalizeMonthlyReview(existing) : { id: undefined, date: key, photo: '', photos: [], shortNote: '', memo: '', satisfaction: 0 });
    setJournalEditing(!existing);
    setJournalSaveMessage('');
  };
  useEffect(() => {
    if (!openDailyReview || !premiumHistory) return;
    const key = initialDate ?? dateKey(now);
    setSelectedKey(key);
    setHasSelectedDate(true);
    loadJournalDraft(key);
  }, [openDailyReview, initialDate, premiumHistory]);
  const chooseJournalPhoto = async () => {
    if (selectedJournalPhotos.length >= maxJournalPhotos) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.78 });
    const uri = result.canceled ? undefined : result.assets?.[0]?.uri;
    if (!uri) return;
    let persistentUri: string;
    try {
      persistentUri = persistPhotoUri(uri, 'journal');
    } catch (error) {
      console.warn('Could not persist journal photo.', error);
      return;
    }
    setJournalDraft((current) => {
      const photos = [...new Set([...(current.photos ?? []), current.photo ?? '', persistentUri].filter(Boolean))];
      return { ...current, photo: photos[0] ?? '', photos };
    });
  };
  const saveJournal = () => {
    const photos = [...new Set([...(journalDraft.photos ?? []), journalDraft.photo ?? ''].filter(Boolean))];
    onSaveDailyReview(selectedKey.slice(0, 7), { ...journalDraft, id: selectedDayReview?.id ?? journalDraft.id, date: selectedKey, photo: photos[0] ?? '', photos, shortNote: journalDraft.shortNote?.trim() ?? '', memo: journalDraft.memo?.trim() ?? '' });
    setJournalEditing(false);
    setJournalSaveMessage(photos.length > 0 ? '写真と記録を更新しました' : '記録を更新しました');
  };
  const confirmDeleteJournal = () => {
    if (!selectedDayReviewEntry) return;
    Alert.alert('記録を削除しますか？', 'この日の記録と写真だけを削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => {
        onDeleteReview(selectedDayReviewEntry.monthKey, selectedDayReviewEntry.reviewKey);
        setJournalDraft({ id: undefined, date: selectedKey, photos: [], photo: '', shortNote: '', memo: '', satisfaction: 0 });
        setJournalEditing(true);
        setJournalSaveMessage('この日の記録を削除しました');
      } },
    ]);
  };
  const createMonthlyCard = () => {
    const selectedPhotos = monthlyPhotoIds.slice(0, monthlyCardLimit);
    if (selectedPhotos.length === 0) {
      Alert.alert('写真がありません', '今日の記録に写真を追加すると、今月の振り返りカードを作成できます。');
      return;
    }
    const bestTitle = monthEntries.flatMap(([, items]) => items).sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())[0]?.title ?? '';
    setMonthlyCardPhotoCount(selectedPhotos.length);
    setMonthlyCardReady(false);
    setMonthlyEditorOpen(false);
    setMonthlyCardModel({ monthKey: monthPrefix, monthLabel: `${year}年${month + 1}月`, photos: selectedPhotos, template: monthlyCardTemplate, palette: monthlyCardPalette, phrase: monthlyWord.trim().slice(0, 30), bestMemory: (bestMemory.trim() || bestTitle).slice(0, 30) });
  };
  const saveMonthlyCardSettings = React.useCallback(() => {
    if (!monthlyCardModel) return;
    const card: MonthlyReflectionCard = {
      monthKey: monthlyCardModel.monthKey,
      photoIds: monthlyCardModel.photos,
      phrase: monthlyCardModel.phrase,
      bestMemory: monthlyCardModel.bestMemory,
      template: monthlyCardModel.template,
      palette: monthlyCardModel.palette,
      updatedAt: new Date().toISOString(),
    };
    onSaveMonthlyReflectionCard(monthlyCardModel.monthKey, card);
  }, [monthlyCardModel, onSaveMonthlyReflectionCard]);
  const shareMonthlyCard = React.useCallback(async () => {
    if (!monthlyCardModel || !monthlyCardReady || !monthlyCardRef.current || monthlyCardGenerating) return;
    setMonthlyCardGenerating(true);
    try {
      // Sharing a card also commits its settings; the image itself remains transient.
      saveMonthlyCardSettings();
      // Keep the native module out of the initial bundle path so Expo Go can
      // still open the app. It is loaded only when the user requests sharing.
      const viewShot = require('react-native-view-shot') as { captureRef?: (view: View, options: { format: 'png'; quality: number; width: number; height: number; result: 'tmpfile' }) => Promise<string> };
      if (!viewShot.captureRef) throw new Error('View capture is unavailable in this build.');
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        } else {
          setTimeout(resolve, 50);
        }
      });
      const uri = await viewShot.captureRef(monthlyCardRef.current, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      await Share.share({ url: uri, message: 'Rhythmの今月の振り返り' });
    } catch (error) {
      console.warn('Could not create monthly reflection card.', error);
      Alert.alert('共有できません', '共有画像の作成にはDevelopment Buildが必要です。カード設定は保存できます。');
    } finally {
      setMonthlyCardGenerating(false);
    }
  }, [monthlyCardGenerating, monthlyCardModel, monthlyCardReady, saveMonthlyCardSettings]);
  const reflectionTemplates: ReflectionCardTemplate[] = premiumHistory ? ['gallery', 'film', 'scrapbook'] : ['gallery'];
  const reflectionPalettes: ReflectionCardPalette[] = premiumHistory ? ['lavender', 'blue', 'peach', 'green'] : ['lavender'];
  const savedMonthlyCard = normalizeReflectionCard(wishMonths[monthPrefix]?.reflectionCard, monthPrefix);
  const openMonthlyReflection = () => {
    if (!premiumHistory) {
      onPremium('reflection');
      return;
    }
    setMonthlyEditorOpen(true);
  };
  const openSavedMonthlyCard = () => {
    if (!savedMonthlyCard?.photoIds?.length) return;
    setMonthlyCardReady(false);
    setMonthlyCardModel({ monthKey: savedMonthlyCard.monthKey, monthLabel: `${year}年${month + 1}月`, photos: savedMonthlyCard.photoIds.slice(0, monthlyCardLimit), template: savedMonthlyCard.template, palette: savedMonthlyCard.palette, phrase: savedMonthlyCard.phrase, bestMemory: savedMonthlyCard.bestMemory });
    setMonthlyCardPhotoCount(Math.min(savedMonthlyCard.photoIds.length, monthlyCardLimit));
    setMonthlyCardGenerating(false);
  };

  const journalEditorContent = !selectedDayReviewEntry || journalEditing ? <View style={[styles.journalEditor, isDark && styles.darkJournalEditor, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border }]}>
    <View style={styles.journalEditorHeader}><View><Text style={[styles.journalEditorTitle, { color: journalTheme.text }]}>今日の記録</Text><Text style={[styles.journalEditorDate, { color: journalTheme.accent }]}>{selectedKey.replaceAll('-', '.')}</Text></View><Text style={[styles.journalEditorCount, { color: journalTheme.accent }]}>写真 {selectedJournalPhotos.length} / {maxJournalPhotos}</Text></View>
    <View style={styles.journalPhotoRow}>{selectedJournalPhotos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.journalPhotoWrap}><Pressable onPress={() => { setSelectedReview({ ...journalDraft, photo: uri, photos: selectedJournalPhotos }); setSelectedReviewPhotoIndex(index); }}><Image source={{ uri }} style={styles.journalPhotoThumb} /></Pressable><Pressable style={styles.journalPhotoRemove} onPress={() => setJournalDraft((current) => { const photos = [...new Set([...(current.photos ?? []), current.photo ?? ''].filter(Boolean))].filter((_, photoIndex) => photoIndex !== index); return { ...current, photo: photos[0] ?? '', photos }; })}><Text style={styles.journalPhotoRemoveText}>×</Text></Pressable></View>)}{selectedJournalPhotos.length < maxJournalPhotos && <Pressable style={[styles.journalPhotoAdd, { borderColor: journalTheme.border, backgroundColor: journalTheme.secondarySurface }]} onPress={() => void chooseJournalPhoto()}><Text style={[styles.journalPhotoAddIcon, { color: journalTheme.accent }]}>＋</Text><Text style={[styles.journalPhotoAddText, { color: journalTheme.accent }]}>写真を追加</Text></Pressable>}</View>
    <TextInput value={journalDraft.shortNote ?? ''} onChangeText={(shortNote) => setJournalDraft((current) => ({ ...current, shortNote }))} placeholder="今日のひとこと" placeholderTextColor={journalTheme.muted} style={[styles.journalInput, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border, color: journalTheme.text }]} />
    <TextInput value={journalDraft.memo ?? ''} onChangeText={(memo) => setJournalDraft((current) => ({ ...current, memo }))} placeholder="今日のことを少し残す" placeholderTextColor={journalTheme.muted} multiline style={[styles.journalInput, styles.journalMemo, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border, color: journalTheme.text }]} />
    <View style={styles.journalActions}><Pressable style={[styles.journalSaveButton, { backgroundColor: journalTheme.accent }]} onPress={saveJournal}><Text style={[styles.journalSaveButtonText, { color: journalTheme.onAccent }]}>{selectedDayReviewEntry ? '更新する' : '保存する'}</Text></Pressable>{selectedDayReviewEntry && <Pressable style={[styles.journalDeleteButton, { borderColor: guideTheme.colors.danger }]} onPress={confirmDeleteJournal}><Text style={[styles.journalDeleteButtonText, { color: guideTheme.colors.danger }]}>削除</Text></Pressable>}</View>
    {journalSaveMessage ? <Text style={[styles.journalPhotoHint, { color: journalTheme.muted }]}>{journalSaveMessage}</Text> : null}
  </View> : <View style={[styles.journalEditor, isDark && styles.darkJournalEditor, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border }]}>
    <View style={styles.journalEditorHeader}><View><Text style={[styles.journalEditorTitle, { color: journalTheme.text }]}>今日の記録</Text><Text style={[styles.journalEditorDate, { color: journalTheme.accent }]}>{selectedKey.replaceAll('-', '.')}</Text></View><Text style={[styles.journalEditorCount, { color: journalTheme.accent }]}>写真 {selectedJournalPhotos.length} / {maxJournalPhotos}</Text></View>
    <View style={styles.journalPhotoRow}>{selectedJournalPhotos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.journalPhotoWrap}><Pressable onPress={() => { setSelectedReview({ ...journalDraft, photo: uri, photos: selectedJournalPhotos }); setSelectedReviewPhotoIndex(index); }}><Image source={{ uri }} style={styles.journalPhotoThumb} /></Pressable></View>)}</View>
    {journalDraft.shortNote ? <Text style={[styles.reviewPhotoModalNote, { color: journalTheme.text }]}>{journalDraft.shortNote}</Text> : null}{journalDraft.memo ? <Text style={[styles.reviewPhotoModalMemo, { color: journalTheme.muted }]}>{journalDraft.memo}</Text> : null}
    <View style={styles.journalActions}><Pressable style={[styles.journalSaveButton, { backgroundColor: journalTheme.accent }]} onPress={() => setJournalEditing(true)}><Text style={[styles.journalSaveButtonText, { color: journalTheme.onAccent }]}>編集</Text></Pressable><Pressable style={[styles.journalDeleteButton, { borderColor: guideTheme.colors.danger }]} onPress={confirmDeleteJournal}><Text style={[styles.journalDeleteButtonText, { color: guideTheme.colors.danger }]}>削除</Text></Pressable></View>
  </View>;

  if (previewJournal && premiumHistory) {
    return <View pointerEvents="none">{journalEditorContent}</View>;
  }
  if (dailyReviewOnly && premiumHistory) {
    return <View style={{ paddingBottom: 8 }}>{journalEditorContent}</View>;
  }

  return (
    <>
      <Text style={[styles.hero, designMode === 'dark' && styles.darkPanel, designMode === 'dark' && styles.darkBodyText]}>{premiumHistory ? (designMode !== 'chic' ? '今月の記録' : '今月の小さな達成') : '1か月を振り返ろう'}</Text>
      {premiumHistory ? <View style={[styles.historySearchBox, { backgroundColor: historySurface, borderColor: historyBorder }, isDark && styles.darkPanel]}><Text style={[styles.taskSearchIcon, { color: historyAccent }, isDark && styles.darkAccentText]}>⌕</Text><TextInput value={historySearch} onChangeText={updateHistorySearch} placeholder="過去に完了したタスクを検索" placeholderTextColor={historyMuted} style={[styles.taskSearchInput, { color: historyText }, isDark && styles.darkBodyText]} />{historySearch.length > 0 && <><Pressable onPress={() => setSearchResultsOpen(true)}><Text style={[styles.historySearchOpenText, { color: historyAccent }, isDark && styles.darkAccentText]}>検索</Text></Pressable><Pressable onPress={() => { setHistorySearch(''); setSearchResultsOpen(false); }}><Text style={[styles.historySearchClear, { color: historyAccent }, isDark && styles.darkAccentText]}>×</Text></Pressable></>}</View> : <Pressable style={[styles.guideCard, premiumGuideCard]} onPress={() => onPremium('history')}><View><Text style={[styles.guideCardTitle, premiumGuideTitle]}>全期間の履歴と検索</Text><Text style={[styles.guideCardCopy, premiumGuideCopy]}>Premiumで詳細な履歴・検索を利用できます</Text></View><Text style={[styles.guideCardArrow, premiumGuideAccent]}>›</Text></Pressable>}
      {previewMode && premiumHistory && searchQuery.trim() && <View style={[styles.historySearchModal, { backgroundColor: historySurface, borderColor: historyBorder }, isDark && styles.darkSurface]}><View style={styles.historySearchModalHeader}><Text style={[styles.historySearchModalTitle, { color: historyText }, isDark && styles.darkBodyText]}>検索結果</Text><Text style={[styles.historySearchModalMeta, { color: historyMuted }, isDark && styles.darkMutedText]}>「{searchQuery}」・{selectedTasks.length}件</Text></View><ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>{selectedTasks.length === 0 ? <Text style={[styles.emptyCopy, { color: historyMuted }, isDark && styles.darkMutedText]}>検索結果がありません</Text> : selectedTasks.map((task) => <View key={task.id} style={[styles.historyTask, { backgroundColor: historySurface, borderColor: historyBorder }, isDark && styles.darkHistoryTask]}><View style={[styles.historyIcon, { backgroundColor: historyAccentSoft, borderColor: historyBorder }, isDark && styles.darkHistoryIcon]}><Text style={[styles.historyIconText, { color: historyAccentStrong }, isDark && styles.darkAccentText]}>{completionIcon}</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, { color: historyText }, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.taskMeta, { color: historyMuted }, isDark && styles.darkMutedText]}>{task.category}・{task.completedAt ? dateKey(task.completedAt).replaceAll('-', '.') : ''}</Text></View></View>)}</ScrollView></View>}
      {premiumHistory && <AchievementVessel tasks={tasks} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} scope={hasSelectedDate ? 'today' : 'month'} targetDate={hasSelectedDate ? selectedKey : undefined} targetMonth={monthPrefix} />}
      {premiumHistory && <View style={styles.monthStats}>
        <View style={[styles.monthStat, isDark && styles.darkMonthStat, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardTint, borderColor: chicPalette.border }]}><Text style={[styles.monthStatNumber, designMode !== 'chic' && { color: guideTheme.colors.primaryAccent }, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{monthlyCount}</Text><Text style={[styles.monthStatLabel, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>今月の完了</Text></View>
        <View style={[styles.monthStat, isDark && styles.darkMonthStat, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardTint, borderColor: chicPalette.border }]}><Text style={[styles.monthStatNumber, designMode !== 'chic' && { color: guideTheme.colors.primaryAccent }, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{activeDays}</Text><Text style={[styles.monthStatLabel, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>活動した日</Text></View>
        <View style={[styles.monthStat, isDark && styles.darkMonthStat, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardTint, borderColor: chicPalette.border }]}><Text style={[styles.monthStatNumber, designMode !== 'chic' && { color: guideTheme.colors.primaryAccent }, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{bestDayCount}</Text><Text style={[styles.monthStatLabel, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>1日の最多</Text></View>
      </View>}
      <View style={[styles.calendarCard, designMode === 'minimal' && styles.calendarCardMinimal, isDark && styles.darkCalendarCard, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
        <View style={[styles.calendarHeader, isDark && styles.darkCalendarHeader]}>
          <View style={styles.historyMonthSwitcher}><Pressable onPress={() => moveHistoryMonth(-1)} style={[styles.historyMonthArrow, { borderColor: historyBorder, backgroundColor: historyAccentSoft }, isDark && styles.darkCalendarNav]}><Text style={[styles.historyMonthArrowText, { color: historyAccent }, isDark && styles.darkAccentText]}>‹</Text></Pressable><Text style={[styles.calendarMonth, { color: historyText }, isDark && styles.darkBodyText]}>{year}年 {month + 1}月</Text><Pressable onPress={() => moveHistoryMonth(1)} style={[styles.historyMonthArrow, { borderColor: historyBorder, backgroundColor: historyAccentSoft }, isDark && styles.darkCalendarNav]}><Text style={[styles.historyMonthArrowText, { color: historyAccent }, isDark && styles.darkAccentText]}>›</Text></Pressable></View>
          <View style={styles.calendarSummaryActions}>
            <Pressable onPress={openMonthlyReflection} style={[styles.monthlyReflectionTrigger, { borderColor: historyAccent, backgroundColor: historyAccentSoft }, isDark && styles.darkMonthlyReflectionTrigger, designMode === 'chic' && chicPalette && { borderColor: chicPalette.accent, backgroundColor: chicPalette.accentSoft }]} accessibilityRole="button">
              <Text style={[styles.monthlyReflectionTriggerText, { color: historyAccentStrong }, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>今月を振り返る</Text>
            </Pressable>
            <Text style={[styles.calendarTotal, { color: historyAccent }, isDark && styles.darkAccentText]}>{monthlyCount}件完了</Text>
          </View>
        </View>
        <View style={styles.weekRow}>
          {['日', '月', '火', '水', '木', '金', '土'].map((day) => <Text key={day} style={[styles.weekLabel, { color: historyMuted }, isDark && styles.darkWeekLabel]}>{day}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = calendarCompletedByDay[key]?.length ?? 0;
            const dayReviews = reviewsByDay[key] ?? [];
            const dayMark = calendarMarks[key] ?? autoMarkForDay(key);
            const selected = hasSelectedDate && key === selectedKey;
            return (
              <Pressable key={key} style={[styles.dayCell, selected && styles.daySelected, selected && isDark && styles.darkDaySelected, { borderColor: historyBorder }, selected && { backgroundColor: historyAccentSoft, borderColor: historyAccent, borderWidth: 1 }]} onPress={() => { setSelectedKey(key); setHasSelectedDate(true); loadJournalDraft(key); setSelectedReview(null); }}>
                <Text style={[styles.dayNumber, { color: historyText }, isDark && styles.darkBodyText, selected && styles.dayNumberSelected, selected && { color: historyAccentStrong }]}>{day}</Text>
                {dayMark && <Text style={[styles.historyCalendarMark, { color: historyAccent }, isDark && styles.darkAccentText]}>{dayMark}</Text>}
                {count > 0 && <View style={[styles.dayDone, { backgroundColor: historyAccentSoft, borderColor: historyAccent }, isDark && styles.darkDayDone]}><Text style={[styles.dayDoneText, { color: historyAccentStrong }]}>{count}</Text></View>}
                {dayReviews.length > 0 && dayMark !== '📸' && <Text style={[styles.reviewCalendarMarker, { color: historyAccent }, isDark && styles.darkAccentText]}>📸</Text>}
              </Pressable>
            );
          })}
        </View>
        {premiumHistory && hasSelectedDate && <>
        <CalendarMarkPicker date={selectedKey} mark={calendarMarks[selectedKey]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
        {!selectedDayReviewEntry || journalEditing ? <View style={[styles.journalEditor, isDark && styles.darkJournalEditor, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border }]}>
          <View style={styles.journalEditorHeader}>
            <View><Text style={[styles.journalEditorTitle, { color: journalTheme.text }]}>今日の記録</Text><Text style={[styles.journalEditorDate, { color: journalTheme.accent }]}>{selectedKey.replaceAll('-', '.')}</Text></View>
            <Text style={[styles.journalEditorCount, { color: journalTheme.accent }]}>写真 {selectedJournalPhotos.length} / {maxJournalPhotos}</Text>
          </View>
          <View style={styles.journalPhotoRow}>
            {selectedJournalPhotos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.journalPhotoWrap}><Pressable onPress={() => { setSelectedReview({ ...journalDraft, photo: uri, photos: selectedJournalPhotos }); setSelectedReviewPhotoIndex(index); }}><Image source={{ uri }} style={styles.journalPhotoThumb} /></Pressable><Pressable style={styles.journalPhotoRemove} onPress={() => setJournalDraft((current) => { const photos = [...new Set([...(current.photos ?? []), current.photo ?? ''].filter(Boolean))].filter((_, photoIndex) => photoIndex !== index); return { ...current, photo: photos[0] ?? '', photos }; })}><Text style={styles.journalPhotoRemoveText}>×</Text></Pressable></View>)}
            {selectedJournalPhotos.length < maxJournalPhotos && <Pressable style={[styles.journalPhotoAdd, { borderColor: journalTheme.border, backgroundColor: journalTheme.secondarySurface }]} onPress={() => void chooseJournalPhoto()}><Text style={[styles.journalPhotoAddIcon, { color: journalTheme.accent }]}>＋</Text><Text style={[styles.journalPhotoAddText, { color: journalTheme.accent }]}>写真を追加</Text></Pressable>}
          </View>
          <TextInput value={journalDraft.shortNote ?? ''} onChangeText={(shortNote) => setJournalDraft((current) => ({ ...current, shortNote }))} placeholder="今日のひとこと" placeholderTextColor={journalTheme.muted} style={[styles.journalInput, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border, color: journalTheme.text }]} />
          <TextInput value={journalDraft.memo ?? ''} onChangeText={(memo) => setJournalDraft((current) => ({ ...current, memo }))} placeholder="今日のことを少し残す" placeholderTextColor={journalTheme.muted} multiline style={[styles.journalInput, styles.journalMemo, { backgroundColor: journalTheme.surface, borderColor: journalTheme.border, color: journalTheme.text }]} />
          <View style={styles.journalActions}><Pressable style={[styles.journalSaveButton, { backgroundColor: journalTheme.accent }]} onPress={saveJournal}><Text style={[styles.journalSaveButtonText, { color: journalTheme.onAccent }]}>{selectedDayReviewEntry ? '更新する' : '保存する'}</Text></Pressable>{selectedDayReviewEntry && <Pressable style={[styles.journalDeleteButton, { borderColor: guideTheme.colors.danger }]} onPress={confirmDeleteJournal}><Text style={[styles.journalDeleteButtonText, { color: guideTheme.colors.danger }]}>削除</Text></Pressable>}</View>
          {journalSaveMessage ? <Text style={[styles.journalPhotoHint, { color: journalTheme.muted }]}>{journalSaveMessage}</Text> : null}
        </View> : <View style={[styles.journalEditor, isDark && styles.darkJournalEditor, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
          <View style={styles.journalEditorHeader}><View><Text style={[styles.journalEditorTitle, { color: journalTheme.text }]}>今日の記録</Text><Text style={[styles.journalEditorDate, { color: journalTheme.accent }]}>{selectedKey.replaceAll('-', '.')}</Text></View><Text style={[styles.journalEditorCount, { color: journalTheme.accent }]}>写真 {selectedJournalPhotos.length} / {maxJournalPhotos}</Text></View>
          <View style={styles.journalPhotoRow}>{selectedJournalPhotos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.journalPhotoWrap}><Pressable onPress={() => { setSelectedReview({ ...journalDraft, photo: uri, photos: selectedJournalPhotos }); setSelectedReviewPhotoIndex(index); }}><Image source={{ uri }} style={styles.journalPhotoThumb} /></Pressable></View>)}</View>
          {journalDraft.shortNote ? <Text style={[styles.reviewPhotoModalNote, isDark && styles.darkBodyText]}>{journalDraft.shortNote}</Text> : null}
          {journalDraft.memo ? <Text style={[styles.reviewPhotoModalMemo, isDark && styles.darkMutedText]}>{journalDraft.memo}</Text> : null}
          <View style={styles.journalActions}><Pressable style={[styles.journalSaveButton, { backgroundColor: journalTheme.accent }]} onPress={() => setJournalEditing(true)}><Text style={[styles.journalSaveButtonText, { color: journalTheme.onAccent }]}>編集</Text></Pressable><Pressable style={[styles.journalDeleteButton, { borderColor: guideTheme.colors.danger }]} onPress={confirmDeleteJournal}><Text style={[styles.journalDeleteButtonText, { color: guideTheme.colors.danger }]}>削除</Text></Pressable></View>
        </View>}
        {(reviewsByDay[selectedKey] ?? []).length > 0 && <View style={[styles.reviewDaySummary, isDark && styles.darkReviewDaySummary]}><Text style={[styles.reviewDaySummaryTitle, isDark && styles.darkBodyText]}>この日の振り返り</Text>{(reviewsByDay[selectedKey] ?? []).map((review, index) => <Pressable key={review.id ?? `${selectedKey}-${index}`} style={[styles.reviewDayRow, isDark && styles.darkReviewDayRow]} onPress={() => setSelectedReview(review)}><Text style={[styles.reviewDayIcon, isDark && styles.darkAccentText]}>✦</Text><View style={{ flex: 1 }}><Text style={[styles.reviewDayText, isDark && styles.darkBodyText]}>{review.shortNote || review.memo || '写真の記録'}</Text><Text style={[styles.reviewDayHint, isDark && styles.darkMutedText]}>タップして記録を見る</Text></View></Pressable>)}</View>}
        {(completedWishesByDay[selectedKey] ?? []).length > 0 && <View style={[styles.reviewDaySummary, isDark && styles.darkReviewDaySummary]}><Text style={[styles.reviewDaySummaryTitle, isDark && styles.darkBodyText]}>この日に叶ったこと</Text>{(completedWishesByDay[selectedKey] ?? []).map((wish) => <View key={wish.id} style={[styles.reviewDayRow, isDark && styles.darkReviewDayRow]}><Text style={styles.reviewDayIcon}>🌟</Text><View style={{ flex: 1 }}><Text style={[styles.reviewDayText, isDark && styles.darkBodyText]}>{wish.title}</Text><Text style={[styles.reviewDayHint, isDark && styles.darkMutedText]}>叶えたいことを完了</Text></View></View>)}</View>}
        {(departurePlansByDay[selectedKey] ?? []).length > 0 && <View style={[styles.reviewDaySummary, isDark && styles.darkReviewDaySummary]}><Text style={[styles.reviewDaySummaryTitle, isDark && styles.darkBodyText]}>この日の出発予定</Text>{(departurePlansByDay[selectedKey] ?? []).map((plan) => <View key={plan.id ?? plan.title} style={[styles.reviewDayRow, isDark && styles.darkReviewDayRow]}><Text style={[styles.reviewDayIcon, isDark && styles.darkAccentText]}>↗</Text><View style={{ flex: 1 }}><Text style={[styles.reviewDayText, isDark && styles.darkBodyText]}>{plan.title}</Text><Text style={[styles.reviewDayHint, isDark && styles.darkMutedText]}>{plan.arrival} 到着 ・ {plan.destination || '目的地未設定'}</Text></View></View>)}</View>}
        </>}
      </View>

      <View style={searchResultsOpen && searchQuery.trim() ? { display: 'none' } : undefined}>
      <View style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{premiumHistory ? (searchResultsOpen && searchQuery.trim() ? '検索結果' : selectedKey.replaceAll('-', '.')) : '最近の完了'}</Text>
        <Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{selectedTasks.length}件見つかりました</Text>
      </View>
      {selectedTasks.length === 0 ? (
        <View style={[styles.emptyCard, isDark && styles.darkEmptyCard]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText]}>この日の完了タスクはまだありません。</Text></View>
      ) : selectedTasks.map((task) => (
        <View key={task.id} style={[styles.historyTask, { backgroundColor: historySurface, borderColor: historyBorder }, isDark && styles.darkHistoryTask]}>
          <View style={[styles.historyIcon, { backgroundColor: historyAccentSoft, borderColor: historyBorder }, isDark && styles.darkHistoryIcon]}><Text style={[styles.historyIconText, { color: historyAccentStrong }, isDark && styles.darkAccentText]}>{completionIcon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, { color: historyText }, isDark && styles.darkBodyText]}>{task.title}</Text>
            <Text style={[styles.taskMeta, { color: historyMuted }, isDark && styles.darkMutedText]}>{task.category} ・ {task.completedAt ? dateKey(task.completedAt).replaceAll('-', '.') : ''}</Text>
          </View>
          <View style={styles.historyTaskActions}><Pressable style={[styles.historyTemplateButton, { borderColor: historyBorder }, isDark && styles.darkHistoryTemplateButton]} onPress={() => onSaveTemplate(task)}><Text style={[styles.historyTemplateButtonText, { color: historyText }, isDark && styles.darkBodyText]}>ひな型</Text><Text style={[styles.historyTemplatePremium, { color: historyAccent }, isDark && styles.darkAccentText]}>Premium</Text></Pressable><Pressable style={[styles.restoreButton, { borderColor: historyBorder }, isDark && styles.darkRestoreButton]} onPress={() => onRestore(task.id)}><Text style={[styles.restoreButtonText, { color: historyAccent }, isDark && styles.darkBodyText]}>元に戻す</Text></Pressable></View>
        </View>
      ))}
      </View>
      {visibleRecoveryHistory.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>立て直した記録</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleRecoveryHistory.length}回</Text></View>{visibleRecoveryHistory.slice(0, 5).map((record) => <View key={record.id} style={[styles.recoveryHistoryRow, isDark && styles.darkRecoveryRow]}><View style={[styles.recoveryHistoryIcon, isDark && styles.darkRecoveryIcon]}><Text style={[styles.recoveryHistoryIconText, isDark && styles.darkRecoveryIconText]}>↻</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{record.planTitle}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText]}>{record.action === 'leave_now' ? '今すぐ出発' : record.action === 'delay_arrival' ? '到着予定を変更' : record.action === 'contact' ? '遅れる連絡' : '予定を組み直し'} ・ 見込み {record.estimatedArrival}</Text></View></View>)}</View>}
      {visibleFocusSessions.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>集中した記録</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{premiumHistory ? `今月 ${monthlyFocusMinutes}分` : '直近7日'}</Text></View>{visibleFocusSessions.slice(0, 5).map((session) => <View key={session.id} style={[styles.recoveryHistoryRow, isDark && styles.darkRecoveryRow]}><View style={[styles.recoveryHistoryIcon, styles.focusHistoryIcon, isDark && styles.darkRecoveryIcon]}><Text style={[styles.focusHistoryIconText, isDark && styles.darkFocusIconText]}>◉</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{session.taskTitle}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText]}>{session.durationMinutes}分 ・ {dateKey(session.completedAt).replaceAll('-', '.')}</Text></View></View>)}</View>}
      {(visibleDepartureCheckIns.length > 0 || departureBehaviorDetails.length > 0) && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>出発・行動の記録</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleDepartureCheckIns.length + departureBehaviorDetails.length}件</Text></View>{visibleDepartureCheckIns.slice(0, 5).map((record) => <View key={`checkin-${record.id}`} style={[styles.recoveryHistoryRow, isDark && styles.darkRecoveryRow]}><View style={[styles.recoveryHistoryIcon, isDark && styles.darkRecoveryIcon]}><Text style={[styles.recoveryHistoryIconText, isDark && styles.darkRecoveryIconText]}>➜</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{record.planTitle}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText]}>{record.onTime ? '予定どおり出発' : '遅れて出発'} ・ {dateKey(record.departedAt).replaceAll('-', '.')} {formatLiveTime(new Date(record.departedAt))}</Text></View></View>)}{departureBehaviorDetails.map((detail) => <View key={`behavior-${detail.title}-${detail.date ?? ''}`} style={[styles.recoveryHistoryRow, isDark && styles.darkRecoveryRow]}><View style={[styles.recoveryHistoryIcon, isDark && styles.darkRecoveryIcon]}><Text style={[styles.recoveryHistoryIconText, isDark && styles.darkRecoveryIconText]}>↗</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{detail.title}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText]}>{detail.date ? `${detail.date.replaceAll('-', '.')} ・ ` : ''}{detail.preparation ? `準備 ${formatLiveTime(new Date(detail.preparation.occurredAt))}` : '準備記録なし'}{detail.departure ? ` ・ 出発 ${formatLiveTime(new Date(detail.departure.occurredAt))}` : ' ・ 出発記録なし'}</Text></View></View>)}</View>}
      {visibleNotificationEvents.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>通知に答えた記録</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleNotificationEvents.length}件</Text></View>{visibleNotificationEvents.map((event) => <View key={event.id} style={[styles.recoveryHistoryRow, isDark && styles.darkRecoveryRow]}><View style={[styles.recoveryHistoryIcon, styles.focusHistoryIcon, isDark && styles.darkRecoveryIcon]}><Text style={[styles.focusHistoryIconText, isDark && styles.darkFocusIconText]}>{event.notificationAction === 'completed' ? '✓' : '後'}</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{event.taskTitleSnapshot || event.departurePlanTitleSnapshot || '通知への回答'}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText]}>{event.notificationAction === 'completed' ? '完了として回答' : 'あとで確認'} ・ {dateKey(event.occurredAt).replaceAll('-', '.')} {formatLiveTime(new Date(event.occurredAt))}</Text></View></View>)}</View>}
      <Modal visible={searchResultsOpen && Boolean(searchQuery.trim())} transparent animationType="fade" onRequestClose={() => setSearchResultsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSearchResultsOpen(false)}>
          <Pressable style={[styles.historySearchModal, { backgroundColor: historySurface, borderColor: historyBorder }, isDark && styles.darkSurface]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.historySearchModalHeader}><Text style={[styles.historySearchModalTitle, { color: historyText }, isDark && styles.darkBodyText]}>検索結果</Text><Pressable onPress={() => setSearchResultsOpen(false)}><Text style={[styles.historySearchClear, { color: historyAccent }, isDark && styles.darkAccentText]}>×</Text></Pressable></View>
            <Text style={[styles.historySearchModalMeta, { color: historyMuted }, isDark && styles.darkMutedText]}>「{searchQuery}」・{selectedTasks.length}件</Text>
            <ScrollView style={styles.historySearchResults} contentContainerStyle={{ paddingBottom: 8 }}>
              {selectedTasks.length === 0 ? <Text style={[styles.emptyCopy, { color: historyMuted }, isDark && styles.darkMutedText]}>検索結果がありません</Text> : selectedTasks.map((task) => <View key={task.id} style={[styles.historyTask, { backgroundColor: historySurface, borderColor: historyBorder }, isDark && styles.darkHistoryTask]}><View style={[styles.historyIcon, { backgroundColor: historyAccentSoft, borderColor: historyBorder }, isDark && styles.darkHistoryIcon]}><Text style={[styles.historyIconText, { color: historyAccentStrong }, isDark && styles.darkAccentText]}>{completionIcon}</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, { color: historyText }, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.taskMeta, { color: historyMuted }, isDark && styles.darkMutedText]}>{task.category}・{task.completedAt ? dateKey(task.completedAt).replaceAll('-', '.') : ''}</Text></View><View style={styles.historyTaskActions}><Pressable style={[styles.restoreButton, { borderColor: historyBorder }, isDark && styles.darkRestoreButton]} onPress={() => onRestore(task.id)}><Text style={[styles.restoreButtonText, { color: historyAccent }, isDark && styles.darkBodyText]}>元に戻す</Text></Pressable></View></View>)}
            </ScrollView>
            <Pressable style={[styles.historySearchClose, { borderColor: historyBorder, backgroundColor: historyAccentSoft }, isDark && styles.darkRestoreButton]} onPress={() => setSearchResultsOpen(false)}><Text style={[styles.historySearchCloseText, { color: historyAccent }, isDark && styles.darkBodyText]}>閉じる</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(selectedReview)} transparent animationType="fade" onRequestClose={() => setSelectedReview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedReview(null)}>
          <Pressable style={[styles.reviewPhotoModal, isDark && styles.darkReviewModal]} onPress={(event) => event.stopPropagation()}>
            {(() => {
              const photos = [...new Set([...(selectedReview?.photos ?? []), selectedReview?.photo ?? ''].filter(Boolean))];
              const photo = photos[selectedReviewPhotoIndex] ?? photos[0];
              return photo ? <><Image source={{ uri: photo }} style={[styles.reviewPhotoLarge, isDark && styles.darkReviewImage]} />{photos.length > 1 && <View style={styles.reviewPhotoPager}>{photos.map((uri, index) => <Pressable key={uri} style={[styles.reviewPhotoPagerDot, isDark && styles.darkReviewPagerDot, index === selectedReviewPhotoIndex && styles.reviewPhotoPagerDotActive]} onPress={() => setSelectedReviewPhotoIndex(index)}><Text style={[styles.reviewPhotoPagerText, isDark && styles.darkBodyText]}>{index + 1}</Text></Pressable>)}</View>}</> : <View style={[styles.reviewPhotoLargeEmpty, isDark && styles.darkReviewImage]}><Text style={[styles.reviewPhotoLargeEmptyText, isDark && styles.darkMutedText]}>写真なし</Text></View>;
            })()}
            {selectedReview?.shortNote ? <Text style={[styles.reviewPhotoModalNote, isDark && styles.darkBodyText]}>{selectedReview.shortNote}</Text> : null}
            {selectedReview?.memo ? <Text style={[styles.reviewPhotoModalMemo, isDark && styles.darkMutedText]}>{selectedReview.memo}</Text> : null}
            <View style={styles.reviewPhotoModalActions}>
              <Pressable style={[styles.reviewEditButton, isDark && styles.darkReviewEditButton]} onPress={() => { if (!selectedReviewEntry) return; setReviewEditNote(selectedReview?.shortNote ?? ''); setReviewEditMemo(selectedReview?.memo ?? ''); setEditingReview(selectedReviewEntry); setSelectedReview(null); }}><Text style={[styles.reviewEditButtonText, isDark && styles.darkAccentText]}>編集</Text></Pressable>
              <Pressable style={[styles.reviewDeleteButton, isDark && styles.darkDangerBorder]} onPress={() => { if (!selectedReviewEntry) return; onDeleteReview(selectedReviewEntry.monthKey, selectedReviewEntry.reviewKey); setSelectedReview(null); }}><Text style={[styles.reviewDeleteButtonText, isDark && styles.darkDangerText]}>削除</Text></Pressable>
            </View>
            <Pressable style={[styles.reviewPhotoModalClose, isDark && styles.darkRestoreButton]} onPress={() => setSelectedReview(null)}><Text style={styles.reviewPhotoModalCloseText}>閉じる</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={monthlyEditorOpen && premiumHistory} transparent animationType="slide" onRequestClose={() => setMonthlyEditorOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMonthlyEditorOpen(false)}>
          <Pressable style={[styles.reviewEditModal, isDark && styles.darkReviewModal]} onPress={(event) => event.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
              <Text style={[styles.reviewEditTitle, isDark && styles.darkBodyText]}>今月を振り返る</Text>
              <Text style={[styles.journalPhotoHint, isDark && styles.darkMutedText]}>{monthPrefix.replace('-', '.')} ・ 今月の記録写真からカードを作成します。</Text>
              <Text style={[reflectionStyles.controlLabel, { color: guideTheme.colors.secondaryText }]}>今月の言葉</Text>
              <TextInput value={monthlyWord} onChangeText={setMonthlyWord} placeholder="今月の自分へひとこと" placeholderTextColor={guideTheme.colors.secondaryText} style={[styles.journalInput, isDark && styles.darkInput]} />
              <TextInput value={bestMemory} onChangeText={setBestMemory} placeholder="今月のベスト" placeholderTextColor={guideTheme.colors.secondaryText} style={[styles.journalInput, isDark && styles.darkInput]} />
              <Text style={[reflectionStyles.controlLabel, { color: guideTheme.colors.secondaryText }]}>テンプレート</Text>
              <View style={reflectionStyles.choiceRow}>{reflectionTemplates.map((template) => <Pressable key={template} onPress={() => setMonthlyCardTemplate(template)} style={[reflectionStyles.choiceChip, { borderColor: monthlyCardTemplate === template ? guideTheme.colors.primaryAccent : guideTheme.colors.border, backgroundColor: monthlyCardTemplate === template ? guideTheme.colors.softAccent : 'transparent' }]}><Text style={{ color: monthlyCardTemplate === template ? guideTheme.colors.primaryAccent : guideTheme.colors.secondaryText, fontSize: 10, fontWeight: '800' }}>{reflectionTemplateLabels[template]}</Text></Pressable>)}</View>
              <Text style={[reflectionStyles.controlLabel, { color: guideTheme.colors.secondaryText }]}>カラーパレット</Text>
              <View style={reflectionStyles.choiceRow}>{reflectionPalettes.map((paletteId) => <Pressable key={paletteId} onPress={() => setMonthlyCardPalette(paletteId)} style={[reflectionStyles.choiceChip, { borderColor: monthlyCardPalette === paletteId ? reflectionCardPalettes[paletteId].accent : guideTheme.colors.border, backgroundColor: monthlyCardPalette === paletteId ? reflectionCardPalettes[paletteId].background : 'transparent' }]}><View style={[reflectionStyles.paletteDot, { backgroundColor: reflectionCardPalettes[paletteId].accent }]} /><Text style={{ color: guideTheme.colors.secondaryText, fontSize: 10, fontWeight: '800' }}>{reflectionPaletteLabels[paletteId]}</Text></Pressable>)}</View>
              <Text style={[styles.journalPhotoHint, isDark && styles.darkMutedText]}>写真 {Math.min(monthlyPhotoIds.length, monthlyCardLimit)} / {monthlyCardLimit}</Text>
              <View style={styles.reviewEditActions}>
                <Pressable style={[styles.reviewEditCancel, isDark && styles.darkReviewEditCancel]} onPress={() => setMonthlyEditorOpen(false)}><Text style={[styles.reviewEditCancelText, isDark && styles.darkMutedText]}>閉じる</Text></Pressable>
                <Pressable style={styles.reviewEditSave} onPress={createMonthlyCard}><Text style={styles.reviewEditSaveText}>カードをプレビュー</Text></Pressable>
              </View>
              {savedMonthlyCard?.photoIds?.length ? <Pressable style={reflectionStyles.savedCardButton} onPress={() => { setMonthlyEditorOpen(false); openSavedMonthlyCard(); }}><Text style={reflectionStyles.savedCardButtonText}>保存済みカードを見る</Text></Pressable> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(monthlyCardModel)} transparent animationType="fade" onRequestClose={closeMonthlyCard}>
        <Pressable style={styles.modalBackdrop} onPress={closeMonthlyCard}>
          <Pressable style={[styles.reviewPhotoModal, isDark && styles.darkReviewModal]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.reviewEditTitle, isDark && styles.darkBodyText]}>今月の振り返りカード</Text>
            {monthlyCardModel ? <MonthlyReflectionCardView model={monthlyCardModel} cardRef={monthlyCardRef} onReady={() => setMonthlyCardReady(true)} /> : null}
            <Text style={[styles.reviewPhotoModalMemo, isDark && styles.darkMutedText]}>{monthlyCardGenerating ? '共有画像を作成しています…' : monthlyCardReady ? `${monthlyCardPhotoCount}枚の写真から作成しました。共有から「画像を保存」を選べます。` : '写真を読み込んでいます…'}</Text>
            <View style={styles.reviewPhotoModalActions}>
              <Pressable disabled={!monthlyCardReady || monthlyCardGenerating} style={[styles.reviewEditButton, (!monthlyCardReady || monthlyCardGenerating) && { opacity: 0.45 }]} onPress={() => void shareMonthlyCard()}><Text style={[styles.reviewEditButtonText, isDark && styles.darkAccentText]}>共有</Text></Pressable>
              <Pressable style={[styles.reviewPhotoModalClose, isDark && styles.darkRestoreButton]} onPress={closeMonthlyCard} accessibilityRole="button"><Text style={styles.reviewPhotoModalCloseText}>閉じる</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(editingReview)} transparent animationType="fade" onRequestClose={() => setEditingReview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingReview(null)}>
          <Pressable style={[styles.reviewEditModal, isDark && styles.darkReviewModal]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.reviewEditTitle, isDark && styles.darkBodyText]}>振り返りを編集</Text>
            <TextInput value={reviewEditNote} onChangeText={setReviewEditNote} placeholder="一言" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} style={[styles.reviewEditInput, isDark && styles.darkReviewEditInput]} />
            <TextInput value={reviewEditMemo} onChangeText={setReviewEditMemo} placeholder="振り返りメモ" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} multiline style={[styles.reviewEditInput, styles.reviewEditMemo, isDark && styles.darkReviewEditInput]} />
            <View style={styles.reviewEditActions}>
              <Pressable style={[styles.reviewEditCancel, isDark && styles.darkReviewEditCancel]} onPress={() => setEditingReview(null)}><Text style={[styles.reviewEditCancelText, isDark && styles.darkMutedText]}>キャンセル</Text></Pressable>
              <Pressable style={styles.reviewEditSave} onPress={() => { if (editingReview) onUpdateReview(editingReview.monthKey, editingReview.reviewKey, { shortNote: reviewEditNote.trim(), memo: reviewEditMemo.trim() }); setEditingReview(null); }}><Text style={styles.reviewEditSaveText}>保存</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
