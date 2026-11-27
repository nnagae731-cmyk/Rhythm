const React=require('react');
const {render,fireEvent,cleanup,within}=require('@testing-library/react-native');
const {Text,StyleSheet}=require('react-native');
const {HomeScreen}=require('../screens/HomeScreen');
const {styles}=require('../styles/appStyles');
const theme=require('../theme'),dates=require('../features/schedule/dateTimeUtils');
afterEach(()=>cleanup());
test.each(['minimal','dark','chic'])('日記は全ホームタブの上部に表示し、保存した内容と未保存状態を区別する：%s',designMode=>{
 const noop=()=>{},open=jest.fn(),props={tasks:[],allTasks:[],now:new Date(),completionIcon:'✓',designMode,chicPalette:theme.getDesignCheckThemeTokens('cool'),styles,helpers:{...dates,getThemeTokens:theme.getThemeTokens},renderTodayWinStrip:()=> <Text testID="home-hero">TODAY</Text>,selectedTaskIds:[],onOpenTodayRecord:open,onAdd:noop,onOpenFocus:noop,onToggle:noop,onToggleSubtask:noop,onUpdateTaskList:noop,onCompleteParent:noop,onRestore:noop,onEdit:noop,onToggleSelection:noop,onSelectionMode:noop,onClearSelection:noop,onCompleteSelected:noop,onDeleteSelected:noop,onDelete:noop,onSkip:noop,onRemoveRoutine:noop,onDuplicate:noop,onSaveTemplate:noop,onPostpone:noop,onBucket:noop};
 const view=render(<HomeScreen {...props}/>),card=()=>within(view.getByTestId('home-journal-card'));
 expect(card().getByText('ひと言日記')).toBeTruthy();expect(card().queryByText('保存済み')).toBeNull();
 const layout=JSON.stringify(view.toJSON());expect(layout.indexOf('home-journal-card')).toBeLessThan(layout.indexOf('home-hero'));
 for(const tab of ['一覧','ルーティン','今']){fireEvent.press(view.getByText(tab));expect(card().getByText('今日の日記を書く')).toBeTruthy();}
 fireEvent.press(view.getByRole('button',{name:'今日の日記を書く'}));expect(open).toHaveBeenCalledTimes(1);
 view.rerender(<HomeScreen {...props} todayReviewExists todayReviewSummary="散歩が気持ちよかった" todayReviewPhotoUri="file:///diary.jpg"/>);
 expect(card().getByText('保存済み')).toBeTruthy();expect(card().getByText('散歩が気持ちよかった')).toBeTruthy();expect(card().queryByLabelText('今日の日記の写真')).toBeNull();expect(card().getByText('散歩が気持ちよかった').props.numberOfLines).toBe(1);expect(StyleSheet.flatten(view.getByTestId('home-journal-card').props.style).minHeight).toBe(48);
 expect(StyleSheet.flatten(card().getByText('ひと言日記').props.style).fontSize).toBeGreaterThanOrEqual(16);
 view.rerender(<HomeScreen {...props} todayReviewExists todayReviewSaveStatus="saving"/>);expect(card().queryByText('保存済み')).toBeNull();expect(card().getByText('日記を保存中…')).toBeTruthy();
 view.rerender(<HomeScreen {...props} todayReviewExists todayReviewSaveStatus="error"/>);expect(card().queryByText('保存済み')).toBeNull();expect(card().getByText('変更は未保存です。保存を再試行してください')).toBeTruthy();
});
