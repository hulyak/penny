/**
 * Design System Constants
 *
 * Centralized design tokens for consistent UI across the app.
 * Use these instead of hardcoded values in StyleSheet.
 */

// Spacing scale (4px base)
export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

// Font sizes
export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
  hero: 32,
  giant: 40,
} as const;

// Font weights
export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Border radius
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
} as const;

// Icon sizes
export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Component heights
export const ComponentHeight = {
  buttonSm: 36,
  button: 44,
  buttonLg: 52,
  input: 48,
  inputLg: 56,
  header: 60,
  tabBar: 80,
  card: 80,
  avatar: 40,
  avatarLg: 56,
  iconButton: 40,
  iconButtonLg: 44,
} as const;

// Common layout values
export const Layout = {
  screenPaddingHorizontal: Spacing.lg,
  screenPaddingTop: 56,
  cardPadding: Spacing.lg,
  sectionGap: Spacing.xl,
  listItemGap: Spacing.md,
  inlineGap: Spacing.sm,
} as const;

// Shadow presets
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Animation durations (ms)
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// Z-index layers
export const ZIndex = {
  base: 0,
  card: 1,
  dropdown: 10,
  sticky: 100,
  modal: 1000,
  toast: 2000,
} as const;

// Export all as default object for convenience
const Design = {
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  IconSize,
  ComponentHeight,
  Layout,
  Shadow,
  Animation,
  ZIndex,
};

export default Design;
