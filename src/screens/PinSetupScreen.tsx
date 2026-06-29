import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSecurityStore } from '../store/useSecurityStore';
import { useAppTheme } from '../theme';

const PIN_LENGTH = 4;

type Step = 'create' | 'confirm';

export default function PinSetupScreen() {
  const { colors, fonts } = useAppTheme();
  const theme = { colors, fonts };
  const navigation = useNavigation();
  const { setupPin, toggleLock, toggleBiometric, isBiometricAvailable } = useSecurityStore();

  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleDigit = useCallback(
    async (digit: string) => {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === PIN_LENGTH) {
        if (step === 'create') {
          // Move to confirmation
          setFirstPin(newPin);
          setTimeout(() => {
            setPin('');
            setStep('confirm');
          }, 200);
        } else {
          // Confirm step — check match
          if (newPin === firstPin) {
            await setupPin(newPin);
            await toggleLock(true);

            // Offer biometric if available
            if (isBiometricAvailable) {
              Alert.alert(
                'Enable Biometrics?',
                'Use Face ID or fingerprint to unlock Coinzy faster.',
                [
                  {
                    text: 'Not now',
                    style: 'cancel',
                    onPress: () => navigation.goBack(),
                  },
                  {
                    text: 'Enable',
                    onPress: async () => {
                      await toggleBiometric(true);
                      navigation.goBack();
                    },
                  },
                ]
              );
            } else {
              Alert.alert('PIN set', 'Your app is now protected.', [
                { text: 'Done', onPress: () => navigation.goBack() },
              ]);
            }
          } else {
            Vibration.vibrate(Platform.OS === 'ios' ? [0, 50, 50, 50] : 400);
            setPin('');
            setError("PINs don't match. Try again.");
            setStep('create');
            setFirstPin('');
          }
        }
      }
    },
    [pin, step, firstPin, setupPin, toggleLock, toggleBiometric, isBiometricAvailable, navigation]
  );

  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
    setError('');
  }, []);

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  const keypad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  const s = styles(theme);

  return (
    <View style={s.container}>
      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={s.header}>
        <Text style={s.title}>
          {step === 'create' ? 'Create a PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={s.subtitle}>
          {step === 'create'
            ? 'Choose a 4-digit PIN to protect your finances'
            : 'Enter the same PIN again to confirm'}
        </Text>
      </View>

      {/* Step indicator */}
      <View style={s.stepRow}>
        <View style={[s.stepDot, s.stepActive]} />
        <View style={[s.stepDot, step === 'confirm' && s.stepActive]} />
      </View>

      {/* PIN dots */}
      <View style={s.dotsRow}>
        {dots.map((filled, i) => (
          <View key={i} style={[s.dot, filled && s.dotFilled]} />
        ))}
      </View>

      {!!error && <Text style={s.errorText}>{error}</Text>}

      {/* Keypad */}
      <View style={s.keypad}>
        {keypad.map((row, ri) => (
          <View key={ri} style={s.keyRow}>
            {row.map((key, ki) => {
              if (key === '') return <View key={ki} style={s.keyPlaceholder} />;
              if (key === 'del') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={s.keyBtn}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="backspace-outline" size={24} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={s.keyBtn}
                  onPress={() => handleDigit(key)}
                  activeOpacity={0.7}
                >
                  <Text style={s.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    backBtn: {
      position: 'absolute',
      top: 56,
      left: 20,
      padding: 8,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontFamily: 'Sora_700Bold',
      fontSize: 24,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    stepRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 36,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
    },
    stepActive: {
      backgroundColor: theme.colors.primary,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 20,
      marginBottom: 12,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
    },
    dotFilled: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    errorText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: '#E24B4A',
      marginBottom: 8,
      textAlign: 'center',
    },
    keypad: {
      marginTop: 36,
      gap: 12,
    },
    keyRow: {
      flexDirection: 'row',
      gap: 20,
    },
    keyBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyPlaceholder: {
      width: 72,
      height: 72,
    },
    keyText: {
      fontFamily: 'Sora_600SemiBold',
      fontSize: 22,
      color: theme.colors.text,
    },
  });
