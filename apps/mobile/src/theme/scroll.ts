import { Platform } from 'react-native';

/**
 * How far a flick glides on long lists. iOS's default ("normal", 0.998) stops too soon for
 * a card library; 0.999 glides about twice as far. Android keeps its own default.
 */
export const listDeceleration = Platform.OS === 'ios' ? 0.999 : 'normal';
