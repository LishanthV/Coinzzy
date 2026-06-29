import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes, radii, spacing, useAppTheme } from '../theme';

// ── Screen container ─────────────────────────────────────────────────
export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  const { colors: themeColors } = useAppTheme();
  
  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.bg }, style]} edges={['top', 'left', 'right']}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.bg }, style]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.borderSoft }, style]}>
      {children}
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors: themeColors } = useAppTheme();
  const variants = getButtonVariants(themeColors);
  const variantStyle = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variantStyle.container,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color as string} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={[styles.buttonText, variantStyle.text]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const getButtonVariants = (themeColors: typeof colors): Record<ButtonVariant, { container: ViewStyle; text: { color: string } }> => ({
  primary: { container: { backgroundColor: themeColors.primary }, text: { color: themeColors.white } },
  secondary: { container: { backgroundColor: themeColors.surfaceRaised }, text: { color: themeColors.text } },
  ghost: { container: { backgroundColor: 'transparent' }, text: { color: themeColors.primary } },
  danger: { container: { backgroundColor: themeColors.expenseSoft }, text: { color: themeColors.expense } },
});

// ── Text input ────────────────────────────────────────────────────────
export function FormInput(props: TextInputProps & { label?: string }) {
  const { label, style, secureTextEntry, ...rest } = props;
  const [isSecure, setIsSecure] = React.useState(secureTextEntry);
  const { colors: themeColors } = useAppTheme();

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={[styles.label, { color: themeColors.textMuted }]}>{label}</Text> : null}
      <View style={styles.inputContainer}>
        <TextInput
          placeholderTextColor={themeColors.textFaint}
          style={[
            styles.input,
            {
              backgroundColor: themeColors.surfaceAlt,
              borderColor: themeColors.border,
              color: themeColors.text,
            },
            secureTextEntry && { paddingRight: 48 },
            style,
          ]}
          secureTextEntry={isSecure}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsSecure(!isSecure)}
            style={styles.eyeButton}
            hitSlop={8}
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={themeColors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── Section header ───────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  onPressAction,
}: {
  title: string;
  action?: string;
  onPressAction?: () => void;
}) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onPressAction}>
          <Text style={[styles.sectionAction, { color: themeColors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
  },
  sectionAction: {
    color: colors.primary,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
  },
  emptyState: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
});
