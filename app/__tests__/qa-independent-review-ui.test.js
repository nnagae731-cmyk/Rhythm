jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-speech-recognition',()=>({ExpoSpeechRecognitionModule:{getPermissionsAsync:jest.fn(),requestPermissionsAsync:jest.fn(),addListener:jest.fn(),start:jest.fn(),stop:jest.fn()}}));
const React=require('react');
const {render,fireEvent,waitFor,act,cleanup}=require('@testing-library/react-native');
const {Modal,InteractionManager}=require('react-native');
const {VoiceInputModal}=require('../components/VoiceInputModal');
const {RewardedAccessModal}=require('../components/RewardedAccessModal');
afterEach(()=>{cleanup();jest.restoreAllMocks();jest.useRealTimers();});
test('音声入力の本番inline previewはModal・Native権限要求・音声購読を作らない',()=>{
 const speech=require('expo-speech-recognition').ExpoSpeechRecognitionModule;
 const view=render(<VoiceInputModal inlinePreview visible={false} autoStart designMode="minimal" dateKey={()=>'2026-11-22'} onClose={()=>{}} onRoute={()=>false}/>);
 expect(view.UNSAFE_queryAllByType(Modal)).toHaveLength(0);
 Object.values(speech).forEach(fn=>expect(fn).not.toHaveBeenCalled());
 view.unmount();expect(speech.stop).not.toHaveBeenCalled();
});
test('広告画面は処理例外を捕捉し二重実行を防ぎ、保存再試行を表示できる',async()=>{
 jest.useFakeTimers();jest.spyOn(InteractionManager,'runAfterInteractions').mockImplementation(cb=>{cb();return{cancel:()=>{},then:()=>{}}});
 let reject;const boundary=jest.fn().mockImplementationOnce(()=>new Promise((resolve,fail)=>{reject=fail})).mockResolvedValue({success:false,retryWithoutAd:true,message:'広告は視聴済みです'});
 const close=jest.fn();const view=render(<RewardedAccessModal visible title="広告の確認" description="保存テスト" designMode="minimal" onReward={boundary} onClose={close}/>);
 const start=view.getByText('広告を見て取得');act(()=>{fireEvent.press(start);fireEvent.press(start)});
 act(()=>view.UNSAFE_getByType(Modal).props.onRequestClose());
 await act(async()=>{jest.advanceTimersByTime(250)});expect(boundary).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();
 await act(async()=>{reject(new Error('boundary rejected'))});expect(view.getByText('処理を完了できませんでした。もう一度お試しください。')).toBeTruthy();
 fireEvent.press(view.getByText('広告を見て取得'));await act(async()=>{jest.advanceTimersByTime(250)});
 expect(view.getByText('保存を再試行')).toBeTruthy();expect(view.getByText('広告は視聴済みです')).toBeTruthy();
});
