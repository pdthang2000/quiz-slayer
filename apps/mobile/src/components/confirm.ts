import { Alert } from 'react-native';

/** Asks a yes/no question with a native dialog; resolves true on the action button. */
export function confirm(message: string, action: string, cancel: string, danger = false) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(message, undefined, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: danger ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}
