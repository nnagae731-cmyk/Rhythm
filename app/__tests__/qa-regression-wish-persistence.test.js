jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const React=require('react');
const {render,fireEvent,act,cleanup}=require('@testing-library/react-native');
const {Modal,Platform}=require('react-native');
const storage=require('@react-native-async-storage/async-storage');
const {saveRhythmState}=require('../storage/rhythmStorage');
const {WishScreen}=require('../WishScreen');
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('目標保存中は永続化完了前に成功を表示しない',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const original=storage.setItem.getMockImplementation();
 jest.spyOn(storage,'setItem').mockImplementation(async (...args)=>{await gate;return original(...args);});
 const state={wishes:[],actions:[],review:{}};let write;
 const props={designMode:'minimal',chicPattern:'plain',monthLabel:'5月',state,onSaveState:(updater)=>{write=saveRhythmState({wishMonths:{'2026-05':updater(state)}});},canCreateWish:true,affirmations:[],affirmationCustomTexts:[],planTier:'free',onSaveAffirmation:()=>{},onDeleteAffirmation:()=>{},onSaveAffirmationCustomText:()=>{},onDeleteAffirmationCustomText:()=>{},initialEditor:{mode:'wish',title:'目標'}};
 const view=render(<WishScreen {...props}/>);
 try {
  fireEvent.press(view.getByText('保存'));
  if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(m=>typeof m.props.onDismiss==='function');act(()=>modal.props.onDismiss());}
  expect(view.queryByText('叶えたいことを保存しました')).toBeNull();
 } finally {release();if(write)await act(async()=>{await write;});}
});
