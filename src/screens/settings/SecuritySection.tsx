// ─────────────────────────────────────────────────────────────────────────────
// Drop this SecuritySection component into your existing SettingsScreen.tsx
// Import it and render it inside your settings list.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSecurityStore } from '../../store/useSecurityStore';
import { useAppTheme } from '../../theme';

export default function SecuritySection() {
  const { colors, fonts } = useAppTheme();
  const theme = { colors, fonts };
  const navigation = useNavigation<any>();
  const {
    hasPin,
    isLockEnabled,
    isBiometricEnabled,
    isBiometricAvailable,
    toggleLock,
    toggleBiometric,
    removePin,
  } = useSecurityStore();

  const handleToggleLock = async (value: boolean) => {
    if (value && !hasPin) {
      // No PIN yet — go set one up first
      navigation.navigate('PinSetup');
    } else {
      await toggleLock(value);
    }
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN?',
      'This will disable app lock and remove your PIN. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: removePin,
        },
      ]
    );
  };

  const s = styles(theme);

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Security</Text>

      {/* App Lock toggle */}
      <View style={s.row}>
        <View style={s.rowLeft}>
          <View style={s.iconWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={s.rowLabel}>App lock</Text>
            <Text style={s.rowSub}>Require PIN to open Coinzy</Text>
          </View>
        </View>
        <Switch
          value={isLockEnabled}
          onValueChange={handleToggleLock}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {/* Change / Set PIN */}
      <TouchableOpacity
        style={s.row}
        onPress={() => navigation.navigate('PinSetup')}
        activeOpacity={0.7}
      >
        <View style={s.rowLeft}>
          <View style={s.iconWrap}>
            <Ionicons name="keypad-outline" size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={s.rowLabel}>{hasPin ? 'Change PIN' : 'Set up PIN'}</Text>
            <Text style={s.rowSub}>{hasPin ? 'Update your 4-digit PIN' : 'Add a PIN to protect your app'}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textFaint} />
      </TouchableOpacity>

      {/* Biometric toggle — only show if device supports it and PIN is set */}
      {isBiometricAvailable && hasPin && (
        <View style={s.row}>
          <View style={s.rowLeft}>
            <View style={s.iconWrap}>
              <Ionicons name="finger-print-outline" size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={s.rowLabel}>Face ID / Fingerprint</Text>
              <Text style={s.rowSub}>Unlock without entering PIN</Text>
            </View>
          </View>
          <Switch
            value={isBiometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#fff"
          />
        </View>
      )}

      {/* Remove PIN */}
      {hasPin && (
        <TouchableOpacity style={s.row} onPress={handleRemovePin} activeOpacity={0.7}>
          <View style={s.rowLeft}>
            <View style={[s.iconWrap, s.iconDanger]}>
              <Ionicons name="trash-outline" size={18} color="#E24B4A" />
            </View>
            <View>
              <Text style={[s.rowLabel, s.textDanger]}>Remove PIN</Text>
              <Text style={s.rowSub}>Disable app lock entirely</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconDanger: {
      backgroundColor: '#FCEBEB',
    },
    rowLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 15,
      color: theme.colors.text,
    },
    rowSub: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    textDanger: {
      color: '#E24B4A',
    },
  });
