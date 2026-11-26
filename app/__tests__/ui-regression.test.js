const React = require('react');
const { render, fireEvent, screen, act, cleanup } = require('@testing-library/react-native');
const { Modal, Platform, StyleSheet } = require('react-native');
const { PhotoThemeSettingsCard } = require('../components/PhotoThemeSettingsCard');
const { LiveActivitySettingsSheet } = require('../components/LiveActivitySettingsSheet');
const { WishScreen } = require('../WishScreen');
const { DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS, DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION } = require('../features/widget/rhythmLiveActivity');

afterEach(() => { cleanup(); jest.useRealTimers(); });

test('Live Activityの無料設定はロックと選択中を混同せず、閉じる操作では保存しない',()=>{
 const colors={background:'#101522',surface:'#181F2E',secondarySurface:'#20293A',border:'#40506A',text:'#F4F7FC',muted:'#B4C0D4',accent:'#8EA6FF',soft:'#26365F',onAccent:'#101522'};
 const onSave=jest.fn(),onClose=jest.fn();
 const view=render(<LiveActivitySettingsSheet visible options={DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS} customization={DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION} colors={colors} onClose={onClose} onSave={onSave} canCustomize={false} canInteractive={false}/>);
 expect(view.getAllByText('🔒')).toHaveLength(5);
 expect(view.queryByText('表示する ✓')).toBeNull();
 expect(view.getByLabelText('次の予定').props.accessibilityState).toEqual({disabled:true,selected:false});
 fireEvent.press(view.getByLabelText('次の予定'));expect(onSave).not.toHaveBeenCalled();
 expect(view.queryByText('まる文字')).toBeNull();
 fireEvent.press(view.getByLabelText('閉じる'));expect(onClose).toHaveBeenCalledTimes(1);expect(onSave).not.toHaveBeenCalled();
});

test('Live Activityの詳細を折りたたんでも編集中の文字設定と表示内容を保持する',()=>{
 const colors={background:'#fff',surface:'#fff',secondarySurface:'#eee',border:'#bbb',text:'#111',muted:'#555',accent:'#456',soft:'#eef',onAccent:'#fff'},onSave=jest.fn();
 const view=render(<LiveActivitySettingsSheet visible options={DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS} customization={DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION} colors={colors} onClose={()=>{}} onSave={onSave} canCustomize canInteractive/>);
 fireEvent.press(view.getByText('文字・言葉の詳細設定'));fireEvent.press(view.getByText('大きめ'));
 fireEvent.press(view.getByText('文字・言葉の詳細設定'));expect(view.queryByText('大きめ')).toBeNull();
 fireEvent.press(view.getByLabelText('次の予定'));fireEvent.press(view.getByText('設定を保存'));
 expect(onSave).toHaveBeenCalledWith(expect.objectContaining({nextSchedule:false}),expect.objectContaining({fontSize:'large'}));
});
test('トップ写真の選択・調整・削除が対象スロットへ届き、操作領域は分離される', () => {
 const onPick=jest.fn(), onAdjust=jest.fn(), onClear=jest.fn();
 const screen=render(<PhotoThemeSettingsCard photoTheme={{placement:'background',topImageUris:{home:'file:///home.jpg'}}} designMode="minimal" planTier="free" onPremium={()=>{}} onPick={onPick} onAdjust={onAdjust} onClear={onClear} styles={{}} />);
 const change=screen.getByLabelText('今日のトップを変更'), adjust=screen.getByLabelText('今日のトップを再調整'), remove=screen.getByLabelText('今日のトップを外す');
 for (const button of [change,adjust,remove]) { expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44); expect(button.props.hitSlop).toBeUndefined(); }
 fireEvent.press(change); fireEvent.press(adjust); fireEvent.press(remove); fireEvent.press(screen.getByLabelText('予定のトップを選ぶ'));
 expect(onPick.mock.calls).toEqual([['home'],['timeline']]); expect(onAdjust).toHaveBeenCalledWith('home'); expect(onClear).toHaveBeenCalledWith('home');
 expect(screen.queryByLabelText('予定のトップを再調整')).toBeNull();
});
test('Live Activityの状態説明と保存ボタンが表示され設定変更を渡す', () => {
 const colors={background:'#fff',surface:'#fff',secondarySurface:'#eee',border:'#bbb',text:'#111',muted:'#555',accent:'#456',soft:'#eef',onAccent:'#fff'}; const onSave=jest.fn();
 const screen=render(<LiveActivitySettingsSheet visible options={DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS} customization={DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION} colors={colors} onClose={()=>{}} onSave={onSave} canCustomize canInteractive runtimeStatus="unavailable" />);
 expect(StyleSheet.flatten(screen.getByText(/無料版の制限ではありません。端末/).props.style).fontSize).toBeGreaterThanOrEqual(13);
 fireEvent.press(screen.getByText('次の予定')); fireEvent.press(screen.getByText('設定を保存')); expect(onSave.mock.calls[0][0].nextSchedule).toBe(false);
});
test('Wish保存はModal終了後にメッセージを表示し自動で消える', async () => {
 jest.useFakeTimers(); const save=jest.fn();
 const screen=render(<WishScreen designMode="minimal" chicPattern="plain" monthLabel="5月" state={{wishes:[],actions:[],review:{}}} onSaveState={save} canCreateWish affirmations={[]} affirmationCustomTexts={[]} planTier="free" onSaveAffirmation={()=>{}} onDeleteAffirmation={()=>{}} onSaveAffirmationCustomText={()=>{}} onDeleteAffirmationCustomText={()=>{}} initialEditor={{mode:'wish',title:'目標'}} />);
 await act(async()=>{fireEvent.press(screen.getByText('保存'));await Promise.resolve();}); expect(save).toHaveBeenCalledTimes(1);
 if (Platform.OS === 'ios') { const modal=screen.UNSAFE_getAllByType(Modal).find(m=>typeof m.props.onDismiss==='function'); act(()=>modal.props.onDismiss()); }
 expect(screen.getByText('叶えたいことを保存しました')).toBeTruthy(); act(()=>jest.advanceTimersByTime(2800)); expect(screen.queryByText('叶えたいことを保存しました')).toBeNull();
});
test('Wish連続保存では最後の保存からメッセージ表示時間が確保される', async () => {
 jest.useFakeTimers(); const initial={mode:'wish',title:'目標'}; const props={designMode:'minimal',chicPattern:'plain',monthLabel:'5月',state:{wishes:[],actions:[],review:{}},onSaveState:jest.fn(),canCreateWish:true,affirmations:[],affirmationCustomTexts:[],planTier:'free',onSaveAffirmation:()=>{},onDeleteAffirmation:()=>{},onSaveAffirmationCustomText:()=>{},onDeleteAffirmationCustomText:()=>{}};
 const view=render(<WishScreen {...props} initialEditor={initial} />); const finish=async()=>{await act(async()=>{fireEvent.press(view.getByText('保存'));await Promise.resolve();}); if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(m=>typeof m.props.onDismiss==='function');act(()=>modal.props.onDismiss());}};
 await finish(); act(()=>jest.advanceTimersByTime(2000)); view.rerender(<WishScreen {...props} initialEditor={{...initial}} />); await finish(); act(()=>jest.advanceTimersByTime(900)); expect(view.getByText('叶えたいことを保存しました')).toBeTruthy();
});
test.each([
  ['同じ文言を3回', ['wish','wish','wish'], '叶えたいことを保存しました'],
  ['異なる文言へ切替', ['wish','action'], '行動を保存しました'],
])('%sでも最後の保存から表示時間を確保する', async (_label, modes, expected) => {
 jest.useFakeTimers();
 const props={designMode:'minimal',chicPattern:'plain',monthLabel:'5月',state:{wishes:[{id:'w',title:'目標',completed:false,createdAt:'2026-01-01'}],actions:[],review:{}},onSaveState:jest.fn(),canCreateWish:true,affirmations:[],affirmationCustomTexts:[],planTier:'free',onSaveAffirmation:()=>{},onDeleteAffirmation:()=>{},onSaveAffirmationCustomText:()=>{},onDeleteAffirmationCustomText:()=>{}};
 const draft=(mode)=>({mode,title:'入力',wishId:'w'});
 const view=render(<WishScreen {...props} initialEditor={draft(modes[0])} />);
 for (let index=0;index<modes.length;index++){const mode=modes[index];if(index){act(()=>jest.advanceTimersByTime(2000));view.rerender(<WishScreen {...props} initialEditor={draft(mode)} />);}await act(async()=>{fireEvent.press(view.getByText('保存'));await Promise.resolve();});if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(m=>typeof m.props.onDismiss==='function');act(()=>modal.props.onDismiss());}}
 act(()=>jest.advanceTimersByTime(2799));expect(view.getByText(expected)).toBeTruthy();act(()=>jest.advanceTimersByTime(1));expect(view.queryByText(expected)).toBeNull();
});
