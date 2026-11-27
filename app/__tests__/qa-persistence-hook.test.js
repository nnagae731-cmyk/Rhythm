jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const React=require('react');
const {renderHook,act,cleanup}=require('@testing-library/react-native');
const {Alert,AppState}=require('react-native');
const storage=require('@react-native-async-storage/async-storage');
const {STORAGE_KEY}=require('../storage/rhythmState');
const {loadRhythmState}=require('../storage/rhythmStorage');
const {useRhythmPersistence}=require('../storage/useRhythmPersistence');
const originalWrite=storage.setItem.getMockImplementation();
let lifecycle;
function mount(extra={}){
 const wishMonths={},task={id:'one',title:'初期TODO',done:false};
 const props={hydrated:true,hydratedRef:{current:true},wishMonths,setSavedJournalMonths:jest.fn(),createSnapshot:jest.fn(()=>({tasks:[task],wishMonths})),...extra};
 return {...renderHook(p=>useRhythmPersistence(p),{initialProps:props}),props};
}
beforeEach(async()=>{
 jest.useFakeTimers();await storage.clear();storage.setItem.mockReset().mockImplementation(originalWrite);
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});jest.spyOn(console,'warn').mockImplementation(()=>{});
 jest.spyOn(AppState,'addEventListener').mockImplementation((type,listener)=>{lifecycle=listener;return {remove:jest.fn()};});
});
afterEach(()=>{cleanup();jest.useRealTimers();jest.restoreAllMocks();});

test('読込前はsnapshotを生成も保存もせず、読込失敗による保護中も既存ストレージを書き換えない',async()=>{
 await originalWrite(STORAGE_KEY,JSON.stringify({tasks:[{id:'protected'}]}));
 const ref={current:false},view=mount({hydrated:false,hydratedRef:ref});
 await act(async()=>jest.advanceTimersByTime(100));expect(view.props.createSnapshot).not.toHaveBeenCalled();expect(storage.setItem).not.toHaveBeenCalled();
 await expect(view.result.current.waitForSettingsSave(()=>true)).rejects.toThrow('保存データ');
 view.result.current.persistenceDisabledRef.current=true;ref.current=true;view.rerender({...view.props,hydrated:true});
 await act(async()=>jest.advanceTimersByTime(100));expect(storage.setItem).not.toHaveBeenCalled();expect((await loadRhythmState()).tasks[0].id).toBe('protected');
 await expect(view.result.current.waitForSettingsSave(()=>true)).rejects.toThrow('保存データ');
});

test('実際の保存完了まで設定・Wishの待機と日記receiptを成功にせず、backgroundとの重複でも一度だけsettleする',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});storage.setItem.mockImplementationOnce((k,v)=>gate.then(()=>originalWrite(k,v)));
 const view=mount(),settingsDone=jest.fn(),wishDone=jest.fn(),wishFailed=jest.fn();
 view.result.current.waitForSettingsSave(state=>state.tasks[0].id==='one').then(settingsDone);
 view.result.current.pendingWishSavesRef.current.push({expected:view.props.wishMonths,resolve:wishDone,reject:wishFailed});
 try{
  await act(async()=>jest.advanceTimersByTime(79));expect(storage.setItem).not.toHaveBeenCalled();
  await act(async()=>jest.advanceTimersByTime(1));expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(settingsDone).not.toHaveBeenCalled();expect(wishDone).not.toHaveBeenCalled();expect(view.props.setSavedJournalMonths).not.toHaveBeenCalled();
  await act(async()=>lifecycle('background'));expect(settingsDone).not.toHaveBeenCalled();
  await act(async()=>{release();await gate;});
  expect(settingsDone).toHaveBeenCalledTimes(1);expect(wishDone).toHaveBeenCalledTimes(1);expect(wishFailed).not.toHaveBeenCalled();
  expect(view.props.setSavedJournalMonths).toHaveBeenCalledWith(view.props.wishMonths);expect((await loadRhythmState()).tasks[0].id).toBe('one');
 }finally{await act(async()=>{release();await gate;});}
});

test('新しい変更で古い保存待機を失効し、backgroundでは最新のsnapshotだけを即時保存する',async()=>{
 const view=mount(),failed=jest.fn(),wishFailed=jest.fn();
 view.result.current.waitForSettingsSave(state=>state.tasks[0].title==='初期TODO').catch(failed);
 view.result.current.pendingWishSavesRef.current.push({expected:view.props.wishMonths,resolve:jest.fn(),reject:wishFailed});
 const wishMonths={'2026-11':{wishes:[],actions:[],review:{}}},createSnapshot=jest.fn(()=>({tasks:[{id:'one',title:'変更後TODO'}],wishMonths}));
 await act(async()=>view.rerender({...view.props,wishMonths,createSnapshot}));
 expect(failed).toHaveBeenCalledWith(expect.any(Error));expect(wishFailed).toHaveBeenCalledWith(expect.any(Error));
 await act(async()=>lifecycle('inactive'));expect((await loadRhythmState()).tasks[0].title).toBe('変更後TODO');
 await act(async()=>jest.advanceTimersByTime(100));expect(storage.setItem).toHaveBeenCalledTimes(1);
});

test('失敗後の同内容再試行でもsnapshotを新規生成し、成功後はエラーを解除して次の失敗も通知する',async()=>{
 const view=mount();storage.setItem.mockRejectedValueOnce(Error('disk full'));
 await act(async()=>jest.advanceTimersByTime(80));expect(view.result.current.persistenceIssue).toBe('write');expect(view.props.setSavedJournalMonths).not.toHaveBeenCalled();
 expect(Alert.alert).toHaveBeenCalledTimes(1);const failedSnapshot=view.result.current.latestPersistedStateRef.current;
 act(()=>{view.result.current.setPersistenceRetrying(true);view.result.current.setSaveRetry(n=>n+1);});
 expect(view.result.current.latestPersistedStateRef.current).not.toBe(failedSnapshot);expect(view.props.createSnapshot).toHaveBeenCalledTimes(2);
 await act(async()=>jest.advanceTimersByTime(80));expect(view.result.current.persistenceIssue).toBeUndefined();expect(view.result.current.persistenceRetrying).toBe(false);expect((await loadRhythmState()).tasks[0].title).toBe('初期TODO');
 storage.setItem.mockRejectedValueOnce(Error('second failure'));act(()=>view.result.current.setSaveRetry(n=>n+1));await act(async()=>jest.advanceTimersByTime(80));expect(Alert.alert).toHaveBeenCalledTimes(2);
});
