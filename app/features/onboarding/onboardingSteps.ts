export const ONBOARDING_DESIGN_MODE = 'minimal' as const;

export const PREMIUM_SUBSCRIPTION_LABEL =
  'Premium（月額サブスク）';

export const WISH_FREE_ACCESS_COPY =
  'Freeでも広告を見ることで利用できます';

export type OnboardingFeatureId =
  | 'intro'
  | 'todo'
  | 'todoComplete'
  | 'completedTasks'
  | 'taskBuckets'
  | 'taskDetails'
  | 'schedule'
  | 'planRegistration'
  | 'calendarImport'
  | 'focus'
  | 'analysis'
  | 'routine'
  | 'history'
  | 'photoLog'
  | 'wish'
  | 'affirmation'
  | 'design'
  | 'recovery';

export type IntroCardId =
  | 'quickTodo'
  | 'today'
  | 'schedule'
  | 'focus'
  | 'records'
  | 'wish'
  | 'customize';

export type OnboardingStep = {
  id: OnboardingFeatureId;
  title: string;
  description: string;
  actionLabel?: string;
};

export type IntroCard = {
  id: IntroCardId;
  title: string;
  description: string;
  premiumNote?: string;
};

export const INTRO_CARDS: IntroCard[] = [
  {
    id: 'quickTodo',
    title: 'やることを、そのまま入力',
    description:
      '「明日15時に美容院」のように入力すると、日時も自動で設定できます。マイクから話して入力してもOK。',
  },

  {
    id: 'today',
    title: '今日やることを整理しよう',
    description:
      '「今やる・あとで・待ち」に分けて整理。終わったら○をタップ。完了したこともあとから確認できます。',
  },

  {
    id: 'schedule',
    title: '予定と1日の流れをひとつに',
    description:
      'Todoや予定を時間の流れで確認。出発時刻を決めたり、到着時刻から逆算することもできます。',
    premiumNote:
      `到着から逆算は${PREMIUM_SUBSCRIPTION_LABEL}の機能です`,
  },

  {
    id: 'focus',
    title: '今やる1つに集中',
    description:
      'Todoを選んで集中タイマーをスタート。他のアプリを開いている間も、時間はそのまま進みます。',
  },

  {
    id: 'records',
    title: 'できたことを残そう',
    description:
      '完了したTodoや集中の記録を振り返れます。写真と一言・メモで、その日の記録も残せます。',
  },

  {
    id: 'wish',
    title: '叶えたいことを、行動へ',
    description:
      '今月のテーマ、叶えたいこと、そのための行動を整理できます。',
    premiumNote:
      `${PREMIUM_SUBSCRIPTION_LABEL}。${WISH_FREE_ACCESS_COPY}`,
  },

  {
    id: 'customize',
    title: 'Rhythmを、自分らしく',
    description:
      'Mono・Design・Photoから好きな見た目を選べます。Premiumでは、好きな言葉を指定時刻に届けるアファメーションも使えます。',
    premiumNote:
      `一部の機能・デザインは${PREMIUM_SUBSCRIPTION_LABEL}です`,
  },
];

export const ONBOARDING_STEPS: Record<
  Exclude<OnboardingFeatureId, 'intro'>,
  OnboardingStep
> = {
  todo: {
    id: 'todo',
    title: 'やることを、そのまま入力',
    description:
      '「明日15時に美容院」のように入力すると、日時も自動で設定できます。マイクから話して入力してもOK。',
    actionLabel: 'やることを追加',
  },

  todoComplete: {
    id: 'todoComplete',
    title: '終わったら○をタップ',
    description:
      'できたTodoは、左の○をタップすると完了できます。',
  },

  completedTasks: {
    id: 'completedTasks',
    title: '今日できたことを確認',
    description:
      '「今日の進み」をタップすると、今日完了したTodoをあとから確認できます。',
    actionLabel: '今日できたことを見る',
  },

  taskBuckets: {
    id: 'taskBuckets',
    title: '今の状態に合わせて整理',
    description:
      '「今やる・あとで・待ち」に分けて、今すぐやらないことも整理しておけます。',
  },

  taskDetails: {
    id: 'taskDetails',
    title: '必要な時だけ、細かく設定',
    description:
      '通知・期限・繰り返し・ルーティン・サブタスクなどを設定できます。',
  },

  schedule: {
    id: 'schedule',
    title: '1日の流れを時間で見る',
    description:
      'Todoや予定を、時間の流れに沿って確認できます。',
  },

  planRegistration: {
    id: 'planRegistration',
    title: '予定に合わせて登録方法を選ぶ',
    description:
      `「予定表だけ」「出発時刻」「到着から逆算」から選べます。到着から逆算は${PREMIUM_SUBSCRIPTION_LABEL}の機能です。`,
    actionLabel: '予定を登録',
  },

  calendarImport: {
    id: 'calendarImport',
    title: 'いつもの予定もRhythmへ',
    description:
      `端末のカレンダー予定をRhythmへ取り込めます。この機能は${PREMIUM_SUBSCRIPTION_LABEL}です。`,
  },

  focus: {
    id: 'focus',
    title: '今やる1つに集中',
    description:
      'Todoを選んで時間を決めたら、集中タイマーをスタートできます。他のアプリを開いても時間は進みます。',
    actionLabel: '集中を始める',
  },

  analysis: {
    id: 'analysis',
    title: '使うほど、自分の行動が見えてくる',
    description:
      `「記録」では実績、「ルーティン」では継続、「時間と行動」では詳しい傾向を確認できます。時間と行動は${PREMIUM_SUBSCRIPTION_LABEL}です。`,
  },

  routine: {
    id: 'routine',
    title: '続けたいことをルーティンに',
    description:
      '続けられた日・連続日数・継続率を記録できます。途中で止まっても、中断・再開として残ります。',
    actionLabel: 'ルーティンにする',
  },

  history: {
    id: 'history',
    title: '過去のできたことを振り返る',
    description:
      `完了したTodoや活動の記録を確認できます。長期間の履歴や詳しい検索には${PREMIUM_SUBSCRIPTION_LABEL}の機能があります。`,
  },

  photoLog: {
    id: 'photoLog',
    title: '今日を写真で残す',
    description:
      '日付を選んで写真を追加。一言やメモも一緒に残せます。写真記録はFreeでも利用できます。',
    actionLabel: '写真を追加',
  },

  wish: {
    id: 'wish',
    title: '叶えたいことを、行動へ',
    description:
      `「叶えたいこと」は${PREMIUM_SUBSCRIPTION_LABEL}の機能です。${WISH_FREE_ACCESS_COPY}。今月のテーマから、叶えたいこと、そのための行動へつなげられます。`,
    actionLabel: '叶えたいことを見る',
  },

  affirmation: {
    id: 'affirmation',
    title: '好きな言葉を、好きな時間に',
    description:
      `テンプレートや自分の言葉を選び、指定した時刻に通知できます。最大5件。${PREMIUM_SUBSCRIPTION_LABEL}の機能です。`,
    actionLabel: 'アファメーションを見る',
  },

  design: {
    id: 'design',
    title: 'Rhythmを、自分らしく',
    description:
      `Mono・Design・Photoから見た目を選べます。Premium対象には${PREMIUM_SUBSCRIPTION_LABEL}と表示します。`,
    actionLabel: 'デザインを見る',
  },

  recovery: {
    id: 'recovery',
    title: '予定が崩れても、ここから',
    description:
      '遅れてしまった時も、今から出発・予定を変更・遅れる連絡など、次にできることを選べます。',
  },
};

export function getOnboardingStep(
  featureId: Exclude<OnboardingFeatureId, 'intro'>,
): OnboardingStep {
  return ONBOARDING_STEPS[featureId];
}