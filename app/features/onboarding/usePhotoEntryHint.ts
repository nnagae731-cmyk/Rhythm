import { useCallback, useEffect, useRef, useState } from 'react';
import { claimPhotoEntryHint } from './onboardingStorage';

/** Display only in the first eligible home session; receipt survives restarts. */
export function usePhotoEntryHint(enabled: boolean, hasPhoto: boolean) {
  const [visible, setVisible] = useState(false);
  const started = useRef(false);
  const dismissed = useRef(false);
  const hasPhotoRef = useRef(hasPhoto);
  hasPhotoRef.current = hasPhoto;
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void claimPhotoEntryHint(hasPhotoRef.current).then(show => {
      if (!dismissed.current && !hasPhotoRef.current) setVisible(show);
    }).catch(error => console.warn('[Onboarding] Photo hint receipt could not be saved.', error));
  }, [enabled]);
  useEffect(() => { if (hasPhoto) { dismissed.current = true; setVisible(false); } }, [hasPhoto]);
  const dismiss = useCallback(() => { dismissed.current = true; setVisible(false); }, []);
  return { visible: enabled && !hasPhoto && visible, dismiss };
}
