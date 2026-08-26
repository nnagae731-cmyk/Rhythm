import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  DEFAULT_ONBOARDING_STATE,
  hasCompletedOnboarding,
  loadOnboardingState,
  markOnboardingCompleted,
  OnboardingState,
  setOnboardingFirstRunStage,
} from './onboardingStorage';
import { OnboardingFeatureId } from './onboardingSteps';

export function useOnboarding() {
  const [state, setState] =
    useState<OnboardingState>(
      DEFAULT_ONBOARDING_STATE,
    );

  const [ready, setReady] = useState(false);
  const [introVisible, setIntroVisible] =
    useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const loaded =
        await loadOnboardingState();

      if (!active) return;

      setState(loaded);

      const introCompleted =
        hasCompletedOnboarding(
          loaded,
          'intro',
        );

      setIntroVisible(!introCompleted);
      setReady(true);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const isCompleted = useCallback(
    (featureId: OnboardingFeatureId) =>
      hasCompletedOnboarding(
        state,
        featureId,
      ),
    [state],
  );

  const complete = useCallback(
    async (
      featureId: OnboardingFeatureId,
    ) => {
      const next =
        await markOnboardingCompleted(
          featureId,
        );

      setState(next);

      if (featureId === 'intro') {
        setIntroVisible(false);
      }

      return next;
    },
    [],
  );

  /**
   * 初回7枚の
   * 「スキップ」と
   * 「Rhythmをはじめる」
   * の両方で使用する。
   */
  const finishIntro = useCallback(
    async () => {
      await complete('intro');
      const next = await setOnboardingFirstRunStage('demo');
      setState(next);
    },
    [complete],
  );

  const setFirstRunStage = useCallback(async (stage: OnboardingState['firstRunStage']) => {
    const next = await setOnboardingFirstRunStage(stage);
    setState(next);
    return next;
  }, []);

  /**
   * 設定 → Rhythmの使い方
   * から再表示する時に使用。
   *
   * すでにintro完了済みでも
   * 保存状態はリセットしない。
   */
  const openIntro = useCallback(() => {
    setIntroVisible(true);
  }, []);

  /**
   * 設定から見直した時など、
   * 保存状態を変更せず閉じたい場合。
   */
  const closeIntro = useCallback(() => {
    setIntroVisible(false);
  }, []);

  return {
    ready,
    state,

    introVisible,
    openIntro,
    closeIntro,
    finishIntro,
    setFirstRunStage,

    isCompleted,
    complete,
  };
}
