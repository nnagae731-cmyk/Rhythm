jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const React = require('react');
const { Text } = require('react-native');
const { render, fireEvent, waitFor, cleanup } = require('@testing-library/react-native');
const storage = require('@react-native-async-storage/async-storage');
const { usePhotoEntryHint } = require('../features/onboarding/usePhotoEntryHint');
const { ONBOARDING_STORAGE_KEY, normalizeOnboardingState, finishInitialDesign } = require('../features/onboarding/onboardingStorage');
const { PhotoTopEntry } = require('../components/PhotoEntry');
const { INTRO_CARDS } = require('../features/onboarding/onboardingSteps');
const { OnboardingCarousel } = require('../features/onboarding/OnboardingCarousel');
function Harness({ enabled = true, hasPhoto = false }) {
  const hint = usePhotoEntryHint(enabled, hasPhoto);
  return <PhotoTopEntry label="ホームのトップ画" designMode="minimal" hint={hint.visible} onPress={hint.dismiss} />;
}
beforeEach(async () => { await storage.clear(); });
afterEach(cleanup);

test('旧データの任意フラグ未設定は初回扱い。表示後は再起動しても再表示しない', async () => {
  expect(normalizeOnboardingState({ version: 1, completed: {} }).photoEntryHintShown).toBeUndefined();
  const view = render(<Harness />);
  await waitFor(() => expect(view.getByText('写真を設定')).toBeTruthy());
  const saved = JSON.parse(await storage.getItem(ONBOARDING_STORAGE_KEY));
  expect(saved.photoEntryHintShown).toBe(true);
  view.unmount();
  const again = render(<Harness />);
  await finishInitialDesign(); // also verifies other serialized mutations preserve receipt
  await waitFor(() => expect(again.queryByText('写真を設定')).toBeNull());
  expect(JSON.parse(await storage.getItem(ONBOARDING_STORAGE_KEY)).photoEntryHintShown).toBe(true);
});

test('タップでヒントのみ消え、同じ起動中も戻らない', async () => {
  const view = render(<Harness />);
  await waitFor(() => expect(view.getByText('写真を設定')).toBeTruthy());
  fireEvent.press(view.getByRole('button', { name: 'ホームのトップ画を設定' }));
  expect(view.queryByText('写真を設定')).toBeNull();
  view.rerender(<Harness enabled={false} />); view.rerender(<Harness />);
  expect(view.queryByText('写真を設定')).toBeNull();
});

test('どれかの写真が設定されたら消え、写真を外しても再表示しない', async () => {
  const view = render(<Harness />);
  await waitFor(() => expect(view.getByText('写真を設定')).toBeTruthy());
  view.rerender(<Harness hasPhoto />); expect(view.queryByText('写真を設定')).toBeNull();
  view.rerender(<Harness />); expect(view.queryByText('写真を設定')).toBeNull();
});

test('写真が既にあるユーザーには出さない。起動準備中にreceiptを書かない', async () => {
  const view = render(<Harness enabled={false} hasPhoto />);
  expect(await storage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  view.rerender(<Harness hasPhoto />);
  await waitFor(async () => expect(JSON.parse(await storage.getItem(ONBOARDING_STORAGE_KEY)).photoEntryHintShown).toBe(true));
  expect(view.queryByText('写真を設定')).toBeNull();
});

test('紹介スライドの枚数・順序はそのまま、デザイン紹介に静的カメラと一文のみ追加', () => {
  expect(INTRO_CARDS.map(card => card.id)).toEqual(['today', 'voice', 'schedule', 'records', 'customize']);
  const card = INTRO_CARDS.find(item => item.id === 'customize');
  expect(card.description).toContain('カメラのボタンから、いつでも好きな写真に変えられます');
  const view = render(<OnboardingCarousel visible cards={[card]} onDismiss={jest.fn()} renderStep={() => <Text>既存の本番プレビュー</Text>} />);
  expect(view.getByTestId('onboarding-photo-camera-badge')).toBeTruthy();
  expect(view.getByTestId('onboarding-design-preview').props.pointerEvents).toBe('none');
});
