jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications',()=>({getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=>'focus-runtime-notice'),SchedulableTriggerInputTypes:{DATE:'date'}}));
const React=require('react');
const {Text}=require('react-native');
const {renderHook,render,act,cleanup}=require('@testing-library/react-native');
const {useFocusController,FocusRuntimeProvider,FocusControllerContext}=require('../features/focus/useFocusController');
const task={id:'runtime',title:'継続する集中',done:false,bucket:'now',category:'その他',priority:'中'};
const options=(extra={})=>({tasks:[task],availableTasks:[task],designMode:'minimal',planTier:'free',onFocusCompleted:jest.fn(),onBehaviorEvent:jest.fn(),onFocusStateChange:jest.fn(),onFocusNotificationPermission:jest.fn(async()=>false),...extra});
afterEach(()=>{cleanup();jest.useRealTimers();jest.restoreAllMocks();});

test('通知許可を待っている間のリセットは開始を取り消し、連打しても二重セッションを作らない',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});const config=options({onFocusNotificationPermission:jest.fn().mockReturnValueOnce(pending).mockResolvedValue(false)});
 const {result}=renderHook(()=>useFocusController(config));let first;
 act(()=>{first=result.current.toggleTimer();void result.current.toggleTimer();});
 expect(config.onFocusNotificationPermission).toHaveBeenCalledTimes(1);act(()=>result.current.reset());await act(async()=>{release(false);await first;});
 expect(result.current.session).toBeUndefined();expect(result.current.running).toBe(false);
 await act(async()=>{await result.current.toggleTimer();});expect(result.current.running).toBe(true);
 expect(config.onBehaviorEvent.mock.calls.filter(([e])=>e.type==='focus_started')).toHaveLength(1);
});

test('Providerの時計更新は関係ない画面を再描画せず、表示を外しても同じセッションを継続する',async()=>{
 jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-23T03:00:00Z'));
 let controller;const unrelatedRender=jest.fn();const config=options();
 function Unrelated(){unrelatedRender();return <Text>他の画面</Text>;}
 function Status(){controller=React.useContext(FocusControllerContext);return <Text>{controller.secondsLeft}</Text>;}
 const children=<><Unrelated/><Status/></>;
 const view=render(<FocusRuntimeProvider options={config}>{children}</FocusRuntimeProvider>);
 await act(async()=>{await controller.toggleTimer();});const sessionId=controller.session.id;const renders=unrelatedRender.mock.calls.length;
 await act(async()=>{jest.advanceTimersByTime(2500);});
 expect(controller.session.id).toBe(sessionId);expect(controller.secondsLeft).toBe(1498);expect(controller.running).toBe(true);
 expect(unrelatedRender).toHaveBeenCalledTimes(renders);
 view.rerender(<FocusRuntimeProvider options={config}><Text>予定表に移動</Text><Status/></FocusRuntimeProvider>);
 await act(async()=>{jest.advanceTimersByTime(1000);});expect(controller.session.id).toBe(sessionId);expect(controller.secondsLeft).toBe(1497);
 await act(async()=>{await controller.toggleTimer();});const paused=controller.secondsLeft;
 await act(async()=>{jest.advanceTimersByTime(5000);});expect(controller.secondsLeft).toBe(paused);
 await act(async()=>{await controller.toggleTimer();});expect(controller.running).toBe(true);expect(controller.session.id).toBe(sessionId);
});

test('JS停止相当の時刻ジャンプ後、App activeで期限を再計算し一度だけ完了する',async()=>{
 jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-23T03:00:00Z'));
 const {AppState}=require('react-native');let active;
 jest.spyOn(AppState,'addEventListener').mockImplementation((event,listener)=>{active=listener;return{remove:jest.fn()};});
 const config=options();const {result}=renderHook(()=>useFocusController(config));
 act(()=>result.current.chooseDuration(5));await act(async()=>{await result.current.toggleTimer();});
 jest.setSystemTime(new Date('2026-11-23T03:06:00Z'));await act(async()=>{active('active');active('active');});
 expect(result.current.running).toBe(false);expect(result.current.session).toBeUndefined();expect(result.current.secondsLeft).toBe(0);
 expect(config.onFocusCompleted).toHaveBeenCalledTimes(1);expect(config.onBehaviorEvent.mock.calls.filter(([e])=>e.type==='focus_completed')).toHaveLength(1);
});
