jest.mock('@react-native-community/datetimepicker',()=>()=>null);
const React=require('react');
const {render,fireEvent,cleanup,waitFor}=require('@testing-library/react-native');
const {OnboardingCarousel}=require('../features/onboarding/OnboardingCarousel');
const {OnboardingHint}=require('../features/onboarding/OnboardingHint');
const {INTRO_CARDS}=require('../features/onboarding/onboardingSteps');
const {DesignCustomizeModal}=require('../components/DesignCustomizeModal');
const {AffirmationSettingsCard}=require('../components/AffirmationSettingsCard');
const {WidgetSettingsCard}=require('../components/WidgetSettingsCard');
const {DEFAULT_WIDGET_SETTINGS}=require('../features/widget/widgetSettings');
afterEach(()=>cleanup());
test('はじめにの最終CTAとスキップは異なる操作先へ進む',()=>{
 const dismiss=jest.fn(),final=jest.fn();const view=render(<OnboardingCarousel visible onDismiss={dismiss} onFinalAction={final} cards={[INTRO_CARDS[0]]} showSkip />);
 fireEvent.press(view.getByLabelText('デザインを選ぶ'));expect(final).toHaveBeenCalledTimes(1);expect(dismiss).not.toHaveBeenCalled();
 view.rerender(<OnboardingCarousel visible onDismiss={dismiss} onFinalAction={final} cards={INTRO_CARDS.slice(0,2)} showSkip />);
 fireEvent.press(view.getByLabelText('使い方をスキップ'));expect(dismiss).toHaveBeenCalledTimes(1);
});
test('ガイドの閉じる操作は呼び出し元へ届く',()=>{
 const dismiss=jest.fn();const view=render(<OnboardingHint featureId="todo" visible inline onDismiss={dismiss}/>);
 fireEvent.press(view.getByLabelText('案内を閉じる'));expect(dismiss).toHaveBeenCalledTimes(1);
});
test('デザインカスタマイズ未購入時は広告・購入・復元を選択できる',()=>{
 const purchase=jest.fn(),reward=jest.fn(),restore=jest.fn();const view=render(<DesignCustomizeModal visible designMode="minimal" purchased={false} rewardedAvailable onRewarded={reward} onPurchase={purchase} onRestore={restore} onPremium={()=>{}} onClose={()=>{}}/>);
 fireEvent.press(view.getByText('広告を見て12時間使う'));fireEvent.press(view.getByText('価格を確認して購入'));fireEvent.press(view.getByText('購入を復元'));
 expect(reward).toHaveBeenCalledTimes(1);expect(purchase).toHaveBeenCalledTimes(1);expect(restore).toHaveBeenCalledTimes(1);
});
test('アファメーション画面で入力し通知追加を呼び出す',async()=>{
 const save=jest.fn().mockResolvedValue();const view=render(<AffirmationSettingsCard affirmations={[]} customTexts={[]} designMode="minimal" planTier="premium" compact onPremium={()=>{}} onSave={save} onDelete={()=>{}} onSaveCustomText={()=>{}} onDeleteCustomText={()=>{}} styles={{}}/>);
 fireEvent.press(view.getByText('管理する ›'));fireEvent.changeText(view.getByPlaceholderText('文章を選ぶか、自分で入力'),'今日も進む');fireEvent.press(view.getByText('通知を追加'));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({text:'今日も進む',time:'09:00',enabled:true})));
});
test('無料Widgetの選択画面が開き有料Widgetはロック案内へ進む',()=>{
 const locked=jest.fn();const colors={surface:'#fff',border:'#bbb',primaryText:'#111',secondaryText:'#555',primaryAccent:'#456',softAccent:'#eee',screenBackground:'#fff'};
 const view=render(<WidgetSettingsCard settings={DEFAULT_WIDGET_SETTINGS} onChange={()=>{}} colors={colors} styles={{}} planTier="free" onLockedWidget={locked}/>);
 fireEvent.press(view.getByLabelText(/今やるTODO。/));expect(view.getByText('このウィジェットには写真が設定されていません。')).toBeTruthy();
 fireEvent.press(view.getByLabelText('閉じる'));
 fireEvent.press(view.getByLabelText(/叶えたいこと。/));expect(locked).toHaveBeenCalledWith('premium');
});
