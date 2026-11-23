import React, { useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';
import type { Task, TaskBucket, FocusPersistedState } from '../../types';
import type { DesignMode, ChicThemePalette } from '../../theme';
import type { PlanTier } from '../../premiumAccess';
import type { PremiumGuideFeatureId } from '../../premiumGuide';
import { createCompletedFocusSession, createFocusSessionId, type FocusSession } from '../../focusSession';
import { createFocusStartedEvent, createFocusStoppedEvent, createFocusCompletedBehaviorEvent, type BehaviorEvent } from '../../behaviorEvents';
import { cancelFocusCompletionNotification, cancelPendingFocusCompletionNotifications, scheduleFocusCompletionNotification } from './focusNotifications';
import { enqueueNotificationOperation } from '../notifications/notificationOperationQueue';
import { reconcileNotificationOperation } from '../notifications/pendingReconciliation';

export type FocusModeProps = { tasks: Task[]; designMode: DesignMode; chicPalette?: ChicThemePalette; backgroundImageUri?: string; planTier: PlanTier; onPremium?: (featureId?: PremiumGuideFeatureId) => void; customDurationMinutes?: number; onCustomDurationChange?: (minutes: number) => void; voiceStartRequest?: { durationMinutes: number; id: number }; focusPersistedState?: FocusPersistedState; onFocusStateChange?: (state?: FocusPersistedState) => void; onFocusCompleted: (session: FocusSession) => void; onFocusTaskFinished?: (session: FocusSession) => boolean | void; onFocusStarted?: () => void; onFocusNotificationPermission?: () => Promise<boolean>; onFocusRunningChange?: (running: boolean) => void; onFocusActivityChange?: (state?: { taskTitle?: string; endsAt?: string; elapsedStartAt?: string; elapsedSeconds?: number; remainingSeconds?: number; running?: boolean }) => void; onBehaviorEvent: (event: BehaviorEvent) => void; hapticsEnabled?: boolean; previewCustomDurationOpen?: boolean; previewMode?: boolean };

type FocusControllerOptions = FocusModeProps & {
  availableTasks: Task[];
  enabled?: boolean;
  onHaptic?: (enabled: boolean, pattern?: number | number[]) => void;
  onCompletionAlert?: (taskTitle?: string) => void;
};

/** Runtime is owned by App, not the screen showing the timer. */
export function useFocusController({ tasks, designMode, chicPalette, backgroundImageUri, planTier, onPremium, customDurationMinutes, onCustomDurationChange, voiceStartRequest, focusPersistedState, onFocusStateChange, onFocusCompleted, onFocusTaskFinished, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, onFocusActivityChange, onBehaviorEvent, hapticsEnabled = true, previewCustomDurationOpen = false, previewMode = false, availableTasks, enabled = true, onHaptic = () => undefined, onCompletionAlert }: FocusControllerOptions) {
  const [selectedTaskId, setSelectedTaskId] = useState(availableTasks[0]?.id ?? '');
  const [duration, setDuration] = useState(previewCustomDurationOpen ? customDurationMinutes ?? 47 : 25);
  const [secondsLeft, setSecondsLeft] = useState((previewCustomDurationOpen ? customDurationMinutes ?? 47 : 25) * 60);
  const [running, setRunning] = useState(false);
  const [customEditorOpen, setCustomEditorOpen] = useState(previewCustomDurationOpen);
  const [customDraft, setCustomDraft] = useState(String(previewCustomDurationOpen ? customDurationMinutes ?? 47 : ''));
  const pausedSecondsRef = React.useRef((previewCustomDurationOpen ? customDurationMinutes ?? 47 : 25) * 60);
  const selectedTask = availableTasks.find((task) => task.id === selectedTaskId);
  const sessionRef = React.useRef<{ id: string; startedAt: Date; taskId?: string; taskTitle?: string; plannedDurationMinutes: number } | undefined>(undefined);
  const endAtRef = React.useRef<number | undefined>(undefined);
  const focusElapsedStartAtRef = React.useRef<string | undefined>(undefined);
  const focusStateRestoredRef = React.useRef(false);
  const startBusyRef = React.useRef(false);
  const startGenerationRef = React.useRef(0);
  useEffect(() => () => { startGenerationRef.current += 1; }, []);
  const completionCallbackRef = React.useRef(onFocusCompleted);
  completionCallbackRef.current = onFocusCompleted;
  const behaviorCallbackRef = React.useRef(onBehaviorEvent);
  behaviorCallbackRef.current = onBehaviorEvent;
  const focusNotificationIdRef = React.useRef<string | null>(null);
  const publishFocusState = React.useCallback((runningState: boolean, endAt?: number) => {
    const session = sessionRef.current;
    if (!session) {
      onFocusStateChange?.(undefined);
      return;
    }
    const elapsedSeconds = Math.max(0, session.plannedDurationMinutes * 60 - pausedSecondsRef.current);
    if (runningState || !focusElapsedStartAtRef.current) {
      focusElapsedStartAtRef.current = new Date(Date.now() - elapsedSeconds * 1000).toISOString();
    }
    onFocusStateChange?.({
      sessionId: session.id,
      taskId: session.taskId,
      taskTitle: session.taskTitle,
      plannedDurationMinutes: session.plannedDurationMinutes,
      startedAt: session.startedAt.toISOString(),
      running: runningState,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      pausedSeconds: pausedSecondsRef.current,
      elapsedStartAt: focusElapsedStartAtRef.current,
    });
    onFocusActivityChange?.({ taskTitle: session.taskTitle, endsAt: endAt ? new Date(endAt).toISOString() : undefined, elapsedStartAt: focusElapsedStartAtRef.current, elapsedSeconds, remainingSeconds: runningState ? undefined : pausedSecondsRef.current, running: runningState });
  }, [onFocusActivityChange, onFocusStateChange]);
  const cancelFocusNotification = React.useCallback((sessionIdOverride?: string) => {
    const sessionId = sessionIdOverride ?? sessionRef.current?.id;
    return enqueueNotificationOperation('focus', async () => {
    const isCurrentSession = !sessionRef.current || sessionRef.current.id === sessionId;
    const notificationId = isCurrentSession ? focusNotificationIdRef.current : null;
    const cancel = async () => {
      await cancelFocusCompletionNotification(notificationId);
      if (sessionId) await cancelPendingFocusCompletionNotifications(sessionId);
      if (isCurrentSession && focusNotificationIdRef.current === notificationId) focusNotificationIdRef.current = null;
    };
    if (sessionId) await reconcileNotificationOperation('focus', sessionId, cancel);
    else await cancel();
  });
  }, []);

  useEffect(() => {
    const selectedStillExists = availableTasks.some((task) => task.id === selectedTaskId);
    if (!selectedStillExists) {
      setSelectedTaskId(availableTasks[0]?.id ?? '');
    }
  }, [availableTasks, selectedTaskId]);

  const finishSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    const actualAt = new Date();
    const session = createCompletedFocusSession({ id: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, durationMinutes: activeSession.plannedDurationMinutes, startedAt: activeSession.startedAt, completedAt: actualAt });
    sessionRef.current = undefined;
    startGenerationRef.current += 1;
    endAtRef.current = undefined;
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
    onFocusActivityChange?.(undefined);
    behaviorCallbackRef.current(createFocusCompletedBehaviorEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt }));
    setRunning(false);
    onFocusRunningChange?.(false);
    setSecondsLeft(0);
    pausedSecondsRef.current = 0;
    completionCallbackRef.current(session);
    const prompted = onFocusTaskFinished?.(session) === true;
    void cancelFocusNotification(activeSession.id).catch((error) => console.warn('Focus notification cancellation failed.', error));
    onHaptic(hapticsEnabled, [0, 35, 70]);
    if (!prompted) {
      onCompletionAlert?.(activeSession.taskTitle);
    }
  }, [cancelFocusNotification, hapticsEnabled, onFocusRunningChange, onFocusStateChange, onFocusTaskFinished]);

  const stopActiveSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    sessionRef.current = undefined;
    startGenerationRef.current += 1;
    endAtRef.current = undefined;
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
    onFocusActivityChange?.(undefined);
    onFocusRunningChange?.(false);
    void cancelFocusNotification(activeSession.id).catch(error => console.warn('Focus notification cancellation failed.', error));
    behaviorCallbackRef.current(createFocusStoppedEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt: new Date() }));
  }, [cancelFocusNotification, onFocusActivityChange, onFocusRunningChange, onFocusStateChange]);

  useEffect(() => {
    if (!enabled || previewMode || focusStateRestoredRef.current) return;
    focusStateRestoredRef.current = true;
    if (!focusPersistedState) return;
    const startedAt = new Date(focusPersistedState.startedAt);
    if (Number.isNaN(startedAt.getTime())) {
      onFocusStateChange?.(undefined);
      return;
    }
    sessionRef.current = {
      id: focusPersistedState.sessionId,
      startedAt,
      taskId: focusPersistedState.taskId,
      taskTitle: focusPersistedState.taskTitle,
      plannedDurationMinutes: focusPersistedState.plannedDurationMinutes,
    };
    setDuration(Math.max(1, focusPersistedState.plannedDurationMinutes));
    pausedSecondsRef.current = Math.max(0, Math.round(focusPersistedState.pausedSeconds));
    const restoredElapsedSeconds = Math.max(0, focusPersistedState.plannedDurationMinutes * 60 - pausedSecondsRef.current);
    focusElapsedStartAtRef.current = focusPersistedState.elapsedStartAt ?? new Date(Date.now() - restoredElapsedSeconds * 1000).toISOString();
    if (!focusPersistedState.elapsedStartAt) onFocusStateChange?.({ ...focusPersistedState, elapsedStartAt: focusElapsedStartAtRef.current });
    const savedEndAt = focusPersistedState.endAt ? Date.parse(focusPersistedState.endAt) : undefined;
    if (focusPersistedState.running && savedEndAt && savedEndAt > Date.now()) {
      endAtRef.current = savedEndAt;
      const remaining = Math.max(0, Math.ceil((savedEndAt - Date.now()) / 1000));
      pausedSecondsRef.current = remaining;
      setSecondsLeft(remaining);
      setRunning(true);
      onFocusRunningChange?.(true);
      onFocusActivityChange?.({ taskTitle: sessionRef.current.taskTitle, endsAt: new Date(savedEndAt).toISOString(), elapsedStartAt: focusElapsedStartAtRef.current, elapsedSeconds: restoredElapsedSeconds, running: true });
      return;
    }
    if (focusPersistedState.running && savedEndAt && savedEndAt <= Date.now()) {
      setSecondsLeft(0);
      pausedSecondsRef.current = 0;
      finishSession();
      return;
    }
    endAtRef.current = undefined;
    setSecondsLeft(pausedSecondsRef.current || focusPersistedState.plannedDurationMinutes * 60);
    setRunning(false);
    onFocusRunningChange?.(false);
    onFocusActivityChange?.({ taskTitle: sessionRef.current.taskTitle, elapsedStartAt: focusElapsedStartAtRef.current, elapsedSeconds: restoredElapsedSeconds, remainingSeconds: pausedSecondsRef.current, running: false });
  }, [enabled, finishSession, focusPersistedState, onFocusActivityChange, onFocusRunningChange, onFocusStateChange, previewMode]);

  useEffect(() => {
    if (!enabled || !running) return;
    const updateRemaining = () => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      const remainingSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      pausedSecondsRef.current = remainingSeconds;
      setSecondsLeft(remainingSeconds);
      if (remainingSeconds === 0) finishSession();
    };
    const timer = setInterval(updateRemaining, 500);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') updateRemaining(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [enabled, finishSession, running]);

  const chooseDuration = (minutes: number) => {
    startGenerationRef.current += 1;
    if (sessionRef.current) stopActiveSession();
    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    pausedSecondsRef.current = minutes * 60;
    setRunning(false);
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
  };
  useEffect(() => {
    // A saved custom value remains in storage for a future Premium upgrade,
    // but a Free user must never start it. Keep the existing default fixed
    // duration when access is lost while the timer is idle.
    if (planTier !== 'premium' && !sessionRef.current && !running && ![5, 15, 25, 45].includes(duration)) {
      chooseDuration(25);
      setCustomEditorOpen(false);
    }
  }, [duration, planTier, running]);
  const openCustomDurationEditor = () => {
    if (planTier !== 'premium') {
      onPremium?.('focus_custom_duration');
      return;
    }
    setCustomDraft(String(customDurationMinutes ?? duration));
    setCustomEditorOpen(true);
  };
  useEffect(() => {
    if (previewCustomDurationOpen) setCustomEditorOpen(true);
  }, [previewCustomDurationOpen]);
  const applyCustomDuration = () => {
    const value = Number(customDraft.trim());
    if (!Number.isSafeInteger(value) || value < 1) {
      Alert.alert('集中時間を確認してください', '1分以上の整数で入力してください。');
      return;
    }
    chooseDuration(value);
    onCustomDurationChange?.(value);
    setCustomEditorOpen(false);
  };
  const reset = () => {
    startGenerationRef.current += 1;
    if (sessionRef.current) stopActiveSession();
    void cancelFocusNotification().catch((error) => console.warn('Focus notification cancellation failed.', error));
    onFocusRunningChange?.(false);
    setRunning(false);
    setSecondsLeft(duration * 60);
    pausedSecondsRef.current = duration * 60;
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
  };
  const toggleTimer = async (requestedDurationMinutes?: number) => {
    // First-run GUIDE uses the real Focus screen as a read-only demo.  The
    // CTA should advance the tour without starting a timer, writing a focus
    // session, scheduling a notification, or activating the navigation guard.
    if (previewMode) {
      onFocusStarted?.();
      return;
    }
    if (!enabled || startBusyRef.current) return;
    if (endAtRef.current) {
      const endAt = endAtRef.current;
      if (endAt) {
        const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        pausedSecondsRef.current = remaining;
        setSecondsLeft(remaining);
      }
      // Pause is not a session end: retain the same session id and startedAt
      // so Resume continues the original focus session without emitting a
      // second focus_started or a premature focus_stopped event.
      endAtRef.current = undefined;
      setRunning(false);
      onFocusRunningChange?.(false);
      publishFocusState(false);
      void cancelFocusNotification().catch((error) => console.warn('Focus notification cancellation failed.', error));
      return;
    }
    startBusyRef.current = true;
    const generation = startGenerationRef.current;
    try {
    const notificationPermissionGranted = onFocusNotificationPermission
      ? await onFocusNotificationPermission().catch(error => { console.warn('Focus notification permission failed.', error); return false; })
      : true;
    if (generation !== startGenerationRef.current) return;
    if (requestedDurationMinutes && requestedDurationMinutes !== duration) chooseDuration(requestedDurationMinutes);
    const nextSeconds = requestedDurationMinutes ? requestedDurationMinutes * 60 : pausedSecondsRef.current > 0 ? pausedSecondsRef.current : secondsLeft === 0 ? duration * 60 : secondsLeft;
    if (!sessionRef.current) {
      const startedAt = new Date();
      const id = createFocusSessionId(startedAt, Math.random().toString(36).slice(2, 10));
      const plannedDurationMinutes = Math.max(1, Math.ceil(nextSeconds / 60));
      sessionRef.current = { id, startedAt, taskId: selectedTask?.id, taskTitle: selectedTask?.title, plannedDurationMinutes };
      onFocusStarted?.();
      behaviorCallbackRef.current(createFocusStartedEvent({ sessionId: id, taskId: selectedTask?.id, taskTitle: selectedTask?.title, plannedDurationMinutes, occurredAt: startedAt }));
      onHaptic(hapticsEnabled, 15);
    }
    setSecondsLeft(nextSeconds);
    pausedSecondsRef.current = nextSeconds;
    endAtRef.current = Date.now() + nextSeconds * 1000;
    publishFocusState(true, endAtRef.current);
    setRunning(true);
    onFocusRunningChange?.(true);
    if (sessionRef.current) {
      void enqueueNotificationOperation('focus', async () => {
        const sessionId = sessionRef.current?.id;
        if (!sessionId) return;
        await reconcileNotificationOperation('focus', sessionId, async () => {
          const notificationId = focusNotificationIdRef.current;
          await cancelFocusCompletionNotification(notificationId);
          await cancelPendingFocusCompletionNotifications(sessionId);
          focusNotificationIdRef.current = null;
          if (sessionRef.current?.id !== sessionId || !endAtRef.current) return;
          const scheduledId = await scheduleFocusCompletionNotification({ timerId: sessionId, endAt: new Date(endAtRef.current).toISOString(), taskTitle: sessionRef.current.taskTitle, permissionGranted: notificationPermissionGranted });
          focusNotificationIdRef.current = scheduledId;
        });
      }).catch((error) => {
        if (__DEV__) console.warn('[Notifications] focus completion scheduling failed', error);
      });
    }
    } finally { startBusyRef.current = false; }
  };
  useEffect(() => {
    if (!enabled || !voiceStartRequest || previewMode || planTier !== 'premium' || running) return;
    void toggleTimer(voiceStartRequest.durationMinutes);
  }, [enabled, voiceStartRequest?.id]);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (duration * 60);

  return { availableTasks, selectedTaskId, setSelectedTaskId, selectedTask, session: sessionRef.current, duration, secondsLeft, running, minutes, seconds, progress, customEditorOpen, setCustomEditorOpen, customDraft, setCustomDraft, reset, toggleTimer, chooseDuration, openCustomDurationEditor, applyCustomDuration };
}

export type FocusController = ReturnType<typeof useFocusController>;

export const FocusControllerContext = React.createContext<FocusController | undefined>(undefined);

/** Owns the clock independently of screen mounts without rerendering all of App on every tick. */
export function FocusRuntimeProvider({ options, children }: { options: FocusControllerOptions; children: React.ReactNode }) {
  const controller = useFocusController(options);
  return React.createElement(FocusControllerContext.Provider, { value: controller }, children);
}
