import { Alert as RNAlert, Platform } from 'react-native';

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text?: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  ) => {
    if (Platform.OS === 'web') {
      const fullMsg = message ? `${title}\n\n${message}` : title;
      if (buttons && buttons.length > 0) {
        const hasCancel = buttons.some((b) => b.style === 'cancel');
        const confirmButton = buttons.find((b) => b.style !== 'cancel') || buttons[0];

        if (hasCancel) {
          const confirmed = window.confirm(fullMsg);
          if (confirmed) {
            if (confirmButton.onPress) confirmButton.onPress();
          } else {
            const cancelButton = buttons.find((b) => b.style === 'cancel');
            if (cancelButton && cancelButton.onPress) cancelButton.onPress();
          }
        } else {
          window.alert(fullMsg);
          if (confirmButton.onPress) confirmButton.onPress();
        }
      } else {
        window.alert(fullMsg);
      }
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};
