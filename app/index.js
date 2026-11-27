import { registerRootComponent } from 'expo';
import App from './App';

if (__DEV__ && process.env.EXPO_PUBLIC_RHYTHM_SHARING_DEBUG === '1') require('./features/sharing/debug');

registerRootComponent(App);
