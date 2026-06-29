import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'coinzy_pin_hash';
const BIOMETRIC_ENABLED_KEY = 'coinzy_biometric_enabled';
const LOCK_ENABLED_KEY = 'coinzy_lock_enabled';

// Simple hash — not cryptographic, just obfuscation for local PIN storage
// For production, use expo-crypto: Crypto.digestStringAsync(CryptoDigestAlgorithm.SHA256, pin)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
}

interface SecurityState {
  isLocked: boolean;
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  hasPin: boolean;
  isLoading: boolean;

  // Init — call once on app start
  initSecurity: () => Promise<void>;

  // PIN management
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  removePin: () => Promise<void>;

  // Biometric
  checkBiometricAvailability: () => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  toggleBiometric: (enabled: boolean) => Promise<void>;

  // Lock control
  lock: () => void;
  unlock: () => void;
  toggleLock: (enabled: boolean) => Promise<void>;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  isLocked: false,
  isLockEnabled: false,
  isBiometricEnabled: false,
  isBiometricAvailable: false,
  hasPin: false,
  isLoading: true,

  initSecurity: async () => {
    set({ isLoading: true });
    try {
      const [storedPin, biometricEnabled, lockEnabled] = await Promise.all([
        AsyncStorage.getItem(PIN_KEY),
        AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY),
        AsyncStorage.getItem(LOCK_ENABLED_KEY),
      ]);

      const biometricAvailable = await get().checkBiometricAvailability();
      const isLockEnabled = lockEnabled === 'true';

      set({
        hasPin: !!storedPin,
        isBiometricEnabled: biometricEnabled === 'true' && biometricAvailable,
        isBiometricAvailable: biometricAvailable,
        isLockEnabled,
        // Lock the app on init if lock is enabled
        isLocked: isLockEnabled && !!storedPin,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setupPin: async (pin: string) => {
    const hashed = hashPin(pin);
    await AsyncStorage.setItem(PIN_KEY, hashed);
    set({ hasPin: true });
  },

  verifyPin: async (pin: string) => {
    const stored = await AsyncStorage.getItem(PIN_KEY);
    if (!stored) return false;
    return stored === hashPin(pin);
  },

  removePin: async () => {
    await Promise.all([
      AsyncStorage.removeItem(PIN_KEY),
      AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY),
      AsyncStorage.setItem(LOCK_ENABLED_KEY, 'false'),
    ]);
    set({ hasPin: false, isBiometricEnabled: false, isLockEnabled: false, isLocked: false });
  },

  checkBiometricAvailability: async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  },

  authenticateWithBiometric: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Coinzy',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  },

  toggleBiometric: async (enabled: boolean) => {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
    set({ isBiometricEnabled: enabled });
  },

  toggleLock: async (enabled: boolean) => {
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, enabled.toString());
    set({ isLockEnabled: enabled });
  },

  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
}));
