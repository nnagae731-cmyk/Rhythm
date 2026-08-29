export const ONBOARDING_DESIGN_MODE = 'minimal' as const;

export const PREMIUM_SUBSCRIPTION_LABEL =
  'Premium（月額サブスク）';

export const WISH_FREE_ACCESS_COPY =
  'Freeでも広告を見ることで利用できます';

export type OnboardingFeatureId =
  | 'intro'
  | 'todo'
  | 'voice'
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

/**
 * The first-run tour is intentionally explicit. It is separate from the
 * feature completion callbacks so a user can move through the tour without
 * having to mutate real data first.
 */
export const FREE_GUIDE_TOUR = [
  'todo',
  'taskDetails',
  'taskBuckets',
  'todoComplete',
  'completedTasks',
  'voice',
  'schedule',
  'planRegistration',
  'focus',
  'calendarImport',
  'analysis',
  'routine',
  'history',
  'wish',
] as const satisfies readonly Exclude<OnboardingFeatureId, 'intro'>[];

/** Premium-only guides are kept out of the Free first-run tour. */
export const PREMIUM_GUIDE_TOUR = [
  'photoLog',
  'affirmation',
  'recovery',
] as const satisfies readonly Exclude<OnboardingFeatureId, 'intro'>[];

export type IntroCardId =
  | 'quickTodo'
  | 'voice'
  | 'today'
  | 'schedule'
  | 'focus'
  | 'recovery'
  | 'records';

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
    title: '思いついたら、すぐ追加',
    description: 'やることを思いついた時に、すぐ残せます。',
  },

  {
    id: 'today',
    title: '今日やることが、ひと目でわかる',
    description: '「今はこれ」から、次にやることを確認できます。',
  },

  {
    id: 'schedule',
    title: '予定には、間に合うように',
    description: '準備や移動も含めて動くタイミングを確認できます。',
  },

  {
    id: 'voice',
    title: '話すだけで、Rhythmに入る',
    description: '右上のマイクから話すと、ToDoや予定をフォームへ整理できます。',
  },

  {
    id: 'focus',
    title: '今やるひとつに集中',
    description: 'やることが決まったら、そのまま集中タイムへ。',
  },

  {
    id: 'recovery',
    title: '崩れても、ここから立て直せる',
    description: '遅れた時も、今の状況から次にできることを選べます。',
  },

  {
    id: 'records',
    title: 'できたことも、ちゃんと残る',
    description: '完了したことを振り返って、今日の積み重ねを確認できます。',
  },
];

export const ONBOARDING_STEPS: Record<
  Exclude<OnboardingFeatureId, 'intro'>,
  OnboardingStep
> = {
  todo: {
    id: 'todo',
    title: 'まずは1つ追加してみよう',
    description: 'ここから、やることをすぐ登録できます。',
    actionLabel: 'やることを追加',
  },

  todoComplete: {
    id: 'todoComplete',
    title: '終わったら○をタップ',
    description: 'できたTodoはここから完了できます。',
  },

  completedTasks: {
    id: 'completedTasks',
    title: '今日できたことを確認',
    description:
      '「達成グラフ」をタップすると、今日完了したTodoをあとから確認できます。',
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
    actionLabel: '詳しく設定を見る',
  },

  voice: {
    id: 'voice',
    title: '話すだけで追加できます',
    description: 'ToDoや予定、ルーティンも、右上のマイクから話して追加できます。',
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
      '時間を入れると、その日の流れを確認できます。',
    actionLabel: '予定を登録',
  },

  calendarImport: {
    id: 'calendarImport',
    title: 'いつもの予定もRhythmへ',
    description: '閲覧は無料。広告1回で予定をRhythmへ取り込めます。Premiumなら広告なしで使えます。',
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
      '日付を選んで写真を追加。一言やメモも一緒に残せます。今日の記録はPremiumで利用できます。',
    actionLabel: '写真を追加',
  },

  wish: {
    id: 'wish',
    title: '叶えたいことを、行動へ',
    description: '画面はFreeでも利用できます。追加操作は広告2回で1件、Premiumなら広告なしで使えます。',
    actionLabel: '叶えたいことを見る',
  },

  affirmation: {
    id: 'affirmation',
    title: '好きな言葉を、好きな時間に',
    description:
      `テンプレートや自分の言葉を選び、指定した時刻に通知できます。最大20件。${PREMIUM_SUBSCRIPTION_LABEL}の機能です。`,
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
