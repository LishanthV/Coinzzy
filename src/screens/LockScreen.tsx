import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSecurityStore } from '../store/useSecurityStore';
import { useAppTheme } from '../theme';

const PIN_LENGTH = 4;

export default function LockScreen() {
  const { colors, fonts, themeMode } = useAppTheme();
  const theme = { colors, fonts, dark: themeMode === 'dark' };
  const { authenticateWithBiometric, verifyPin, unlock, isBiometricEnabled } = useSecurityStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (isBiometricEnabled) {
      triggerBiometric();
    }
  }, []);

  // Block timer countdown
  useEffect(() => {
    if (blockTimer <= 0) return;
    const interval = setInterval(() => {
      setBlockTimer((t) => {
        if (t <= 1) {
          setIsBlocked(false);
          setAttempts(0);
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [blockTimer]);

  const triggerBiometric = useCallback(async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      unlock();
    }
  }, [authenticateWithBiometric, unlock]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (isBlocked) return;
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === PIN_LENGTH) {
        const valid = await verifyPin(newPin);
        if (valid) {
          setPin('');
          unlock();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          Vibration.vibrate(Platform.OS === 'ios' ? [0, 50, 50, 50] : 400);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setPin('');

          if (newAttempts >= 5) {
            setIsBlocked(true);
            setBlockTimer(30);
            setError('Too many attempts. Try again in 30s.');
          } else {
            setError(`Incorrect PIN. ${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} left.`);
          }
        }
      }
    },
    [pin, attempts, isBlocked, verifyPin, unlock]
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
    [isBiometricEnabled ? 'bio' : '', '0', 'del'],
  ];

  const s = styles(theme);

  return (
    <LinearGradient
      colors={[theme.colors.bg, theme.colors.surface]}
      style={s.container}
    >
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logoWrap}>
          <Ionicons name="wallet" size={32} color={theme.colors.primary} />
        </View>
        <Text style={s.appName}>Coinzy</Text>
        <Text style={s.subtitle}>
          {isBlocked ? `Locked for ${blockTimer}s` : 'Enter your PIN to continue'}
        </Text>
      </View>

      {/* PIN dots */}
      <View style={[s.dotsRow, shake && s.shake]}>
        {dots.map((filled, i) => (
          <View
            key={i}
            style={[
              s.dot,
              filled && s.dotFilled,
              error && s.dotError,
            ]}
          />
        ))}
      </View>

      {/* Error message */}
      {!!error && <Text style={s.errorText}>{error}</Text>}

      {/* Keypad */}
      <View style={s.keypad}>
        {keypad.map((row, ri) => (
          <View key={ri} style={s.keyRow}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={s.keyPlaceholder} />;
              }
              if (key === 'bio') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={s.keyBtn}
                    onPress={triggerBiometric}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="finger-print"
                      size={26}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                );
              }
              if (key === 'del') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={s.keyBtn}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={24}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={[s.keyBtn, isBlocked && s.keyDisabled]}
                  onPress={() => handleDigit(key)}
                  activeOpacity={0.7}
                  disabled={isBlocked}
                >
                  <Text style={s.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    appName: {
      fontFamily: 'Sora_700Bold',
      fontSize: 26,
      color: theme.colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 20,
      marginBottom: 16,
    },
    shake: {
      // Shake handled via JS state reset — add react-native-reanimated
      // for proper keyframe shake if desired
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
    dotError: {
      borderColor: '#E24B4A',
    },
    errorText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: '#E24B4A',
      marginBottom: 24,
      textAlign: 'center',
    },
    keypad: {
      marginTop: 32,
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
    keyDisabled: {
      opacity: 0.4,
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
