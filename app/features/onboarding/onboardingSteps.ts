export const ONBOARDING_DESIGN_MODE = 'minimal' as const;

export type OnboardingFeatureId =
  | 'todo'
  | 'timeline'
  | 'focus'
  | 'analysis'
  | 'wish'
  | 'routine'
  | 'design';

export type OnboardingStep = {
  id: OnboardingFeatureId;
  title: string;
  description: string;
  actionLabel?: string;
};

export const ONBOARDING_STEPS: Record<
  OnboardingFeatureId,
  OnboardingStep
> = {
  todo: {
    id: 'todo',
    title: 'やることを、そのまま入力',
    description:
      '「明日15時に美容院」のように入力すると、日時も自動で設定できます。マイクから話して入力してもOK。',
    actionLabel: 'やることを追加',
  },

  timeline: {
    id: 'timeline',
    title: '今日の流れを時間で見よう',
    description:
      '予定表では、予定やタスクを時間の流れに沿って確認できます。',
    actionLabel: '予定を追加',
  },

  focus: {
    id: 'focus',
    title: '今やる1つに集中',
    description:
      'Todoを選んで時間を決めたら、集中タイマーをスタートできます。',
    actionLabel: '集中を始める',
  },

  analysis: {
    id: 'analysis',
    title: '自分の行動を振り返る',
    description:
      'Todoの完了や集中時間がたまると、時間の使い方や行動の傾向を確認できます。',
  },

  wish: {
    id: 'wish',
    title: '叶えたいことを残そう',
    description:
      'やりたいことを登録して、叶えるための行動まで少しずつつなげていけます。',
    actionLabel: '叶えたいことを追加',
  },

  routine: {
    id: 'routine',
    title: '続けたいことを習慣に',
    description:
      '繰り返したいことをルーティンにすると、毎日の継続を記録できます。',
    actionLabel: 'ルーティンを追加',
  },

  design: {
    id: 'design',
    title: 'Rhythmを自分らしく',
    description:
      'Mono・Design・写真から、自分に合った見た目を選べます。',
    actionLabel: 'デザインを見る',
  },
};

export function getOnboardingStep(
  featureId: OnboardingFeatureId,
): OnboardingStep {
  return ONBOARDING_STEPS[featureId];
}