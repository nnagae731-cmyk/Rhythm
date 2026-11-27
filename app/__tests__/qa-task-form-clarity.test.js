const React=require('react');
const {render,fireEvent,act,cleanup,within,waitFor}=require('@testing-library/react-native');
const {StyleSheet,Switch}=require('react-native');
const {TaskModal}=require('../components/TaskModal');
const {styles}=require('../styles/appStyles');
const theme=require('../theme');
const dates=require('../features/schedule/dateTimeUtils');
const {hasPremiumAccess}=require('../premiumAccess');
const {CompactNumberSetting}=require('../components/SettingsControls');
function mount(extra={}){
 const onSave=jest.fn(),onPremium=jest.fn();
 const props={visible:true,templates:[],savedTemplates:[],designMode:'minimal',planTier:'free',onPremium,onClose:jest.fn(),onSave,styles,helpers:{...dates,getThemeTokens:theme.getThemeTokens,hasPremiumAccess,summarizePremiumTaskTemplate:()=>''},components:{CompactNumberSetting},...extra};
 const view=render(<TaskModal {...props}/>);return {...view,onSave,onPremium};
}
beforeEach(()=>jest.useFakeTimers());
afterEach(()=>{cleanup();act(()=>jest.runOnlyPendingTimers());jest.useRealTimers();jest.restoreAllMocks();});

test.each(['minimal','dark','chic'])('ルーティンONで直下に4つの間隔が現れ、未選択は保存せず、選ぶと保存できる：%s',designMode=>{
 const view=mount({designMode,chicPalette:designMode==='chic'?theme.getDesignCheckThemeTokens('cool'):undefined});
 fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'皿を洗う');
 expect(view.queryByTestId('task-optional-details')).toBeNull();
 const layout=JSON.stringify(view.toJSON());expect(layout.indexOf('task-repeat-section')).toBeLessThan(layout.indexOf('task-setting-date'));
 fireEvent.press(view.getByRole('switch',{name:'ルーティンにする'}));
 const repeat=within(view.getByTestId('task-repeat-section'));
 for(const name of ['毎日','平日','毎週','毎月'])expect(repeat.getByRole('radio',{name})).toBeTruthy();
 expect(repeat.queryByText('なし')).toBeNull();
 expect(view.getByRole('button',{name:'登録する'}).props.accessibilityState.disabled).toBe(true);
 fireEvent.press(view.getByText('登録する'),{stopPropagation:()=>{}});expect(view.onSave).not.toHaveBeenCalled();
 fireEvent.press(repeat.getByRole('radio',{name:'毎日'}));
 expect(repeat.getByRole('radio',{name:'毎日'}).props.accessibilityState.checked).toBe(true);
 fireEvent.press(view.getByText('登録する'));
 expect(view.onSave).toHaveBeenCalledTimes(1);expect(view.onSave.mock.calls[0][12]).toBe('daily');expect(view.onSave.mock.calls[0][17]).toBe(true);
 expect(view.onPremium).not.toHaveBeenCalled();
});

test('タイトルだけで登録でき、日時・通知は詳細を開かず設定できる',()=>{
 const view=mount();
 expect(view.getByText('やることだけで登録できます。ほかの設定は必要なときだけ。')).toBeTruthy();
 for(const id of ['date','time','reminder','repeat'])expect(view.getByTestId(`task-setting-${id}`)).toBeTruthy();
 expect(view.queryByText('ジャンル')).toBeNull();expect(view.queryByText('かかる時間')).toBeNull();
 expect(StyleSheet.flatten(view.getByText('取り組む時刻').props.style).fontSize).toBeGreaterThanOrEqual(15);
 fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'皿を洗う');fireEvent.press(view.getByText('登録する'));
 const saved=view.onSave.mock.calls[0];expect(saved[0]).toBe('皿を洗う');expect(saved[4]).toBeUndefined();expect(saved[15]).toBeUndefined();expect(saved[12]).toBe('none');expect(saved[17]).toBe(false);
});

test('通常の繰り返しTODOを残し、ルーティンOFFでも選んだ間隔を保持する',()=>{
 const view=mount();fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'部屋を掃除');
 fireEvent.press(view.getByTestId('task-setting-repeat'));fireEvent.press(view.getByRole('radio',{name:'毎週'}));
 fireEvent.press(view.getByRole('switch',{name:'ルーティンにする'}));
 expect(view.getByRole('radio',{name:'毎週'}).props.accessibilityState.checked).toBe(true);
 fireEvent.press(view.getByRole('switch',{name:'ルーティンにする'}));fireEvent.press(view.getByText('登録する'));
 expect(view.onSave.mock.calls[0][12]).toBe('weekly');expect(view.onSave.mock.calls[0][17]).toBe(false);
});

test('タイトルの自動解析より、その場で選び直した繰り返しを優先する',()=>{
 const view=mount();fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'毎日 皿を洗う');act(()=>jest.advanceTimersByTime(150));
 fireEvent.press(view.getByRole('switch',{name:'ルーティンにする'}));expect(view.getByRole('radio',{name:'毎日'}).props.accessibilityState.checked).toBe(true);
 expect(StyleSheet.flatten(view.getByText('毎日').props.style).fontWeight).toBe('800');
 fireEvent.press(view.getByRole('radio',{name:'毎週'}));expect(view.getByRole('radio',{name:'毎週'}).props.accessibilityState.checked).toBe(true);
 fireEvent.press(view.getByText('登録する'));expect(view.onSave.mock.calls[0][12]).toBe('weekly');
});

test('編集時にも詳細を閉じられ、非表示にしても既存の期限・見積・分類を消さない',()=>{
 const task={id:'edit',title:'既存のTODO',done:false,category:'家事',priority:'高',scheduledDate:dates.todayInputValue(),estimatedMinutes:30,deadlineDate:dates.todayInputValue(2),deadlineTime:'18:00',repeatRule:'weekly',isRoutine:true};
 const view=mount({task,planTier:'premium'});
 expect(view.getByTestId('task-optional-details')).toBeTruthy();fireEvent.press(view.getByText('詳しい設定を閉じる'));
 expect(view.queryByTestId('task-optional-details')).toBeNull();fireEvent.press(view.getByText('変更を保存'));
 const saved=view.onSave.mock.calls[0];expect(saved[1]).toBe('家事');expect(saved[2]).toBe('高');expect(saved[5]).toBe(task.deadlineDate);expect(saved[6]).toBe('18:00');expect(saved[19]).toBe(30);expect(saved[12]).toBe('weekly');
});

test('通知の日時を用途ラベルから設定でき、取り組む時刻とは独立して保存する',()=>{
 const view=mount();fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'ゴミを出す');fireEvent.press(view.getByTestId('task-setting-reminder'));
 fireEvent(view.UNSAFE_getAllByType(Switch)[0],'valueChange',true);
 fireEvent.changeText(view.getByLabelText('通知する日'),dates.todayInputValue(1));fireEvent.changeText(view.getByLabelText('通知する時刻'),'08:30');fireEvent.press(view.getByText('登録する'));
 const saved=view.onSave.mock.calls[0];expect(saved[3]).toBe(dates.todayInputValue(1));expect(saved[4]).toBe('08:30');expect(saved[15]).toBeUndefined();
});
