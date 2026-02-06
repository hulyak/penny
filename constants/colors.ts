// ClearPath Design System - Professional Clarity Theme
// Hybrid TradingView/Monarch aesthetic with backward compatibility

const Colors = {
  // New Design System - Primary Colors
  primary: '#14B8A6',          // Teal - primary actions, positive indicators
  primaryLight: '#2DD4BF',
  primaryDark: '#0D9488',
  primaryMuted: 'rgba(20, 184, 166, 0.15)',

  secondary: '#8B5CF6',        // Purple - AI features
  secondaryLight: '#A78BFA',
  secondaryDark: '#7C3AED',

  // Accent colors
  accent: '#14B8A6',           // Teal accent
  accentLight: '#2DD4BF',
  accentMuted: 'rgba(20, 184, 166, 0.15)',

  // Functional colors
  success: '#10B981',          // Green for gains
  successLight: '#34D399',
  successMuted: 'rgba(16, 185, 129, 0.15)',

  warning: '#F59E0B',          // Orange for warnings
  warningLight: '#FBBF24',
  warningMuted: 'rgba(245, 158, 11, 0.15)',

  danger: '#EF4444',           // Red for losses/danger
  dangerLight: '#F87171',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',

  // Dark Theme Backgrounds
  neutral: '#E2E8F0',
  neutralLight: '#A0AEC0',
  neutralMuted: '#1A1A1A',

  background: '#000000',        // Pure black - main background
  backgroundSecondary: '#0A0A0A',
  surface: '#1A1A1A',          // Card backgrounds
  surfaceSecondary: '#242424', // Elevated surfaces (charts)
  surfaceHighlight: '#2A2A2A', // Hover/active states

  // Text colors
  text: '#FFFFFF',             // Primary text
  textSecondary: '#A0A0A0',    // Secondary text, labels
  textMuted: '#707070',        // Tertiary text, metadata
  textLight: '#FFFFFF',
  textInverse: '#000000',

  // Borders and dividers
  border: '#2A2A2A',           // Borders, dividers
  borderLight: '#1F1F1F',
  divider: '#2A2A2A',

  // Additional accent colors
  gold: '#F59E0B',
  goldMuted: 'rgba(245, 158, 11, 0.15)',

  purple: '#8B5CF6',           // AI theme
  purpleMuted: 'rgba(139, 92, 246, 0.15)',

  blue: '#3B82F6',             // Info, user messages
  blueMuted: 'rgba(59, 130, 246, 0.15)',

  cyan: '#14B8A6',             // Same as primary
  cyanMuted: 'rgba(20, 184, 166, 0.15)',

  // Legacy compatibility
  lavender: '#8B5CF6',
  lavenderMuted: 'rgba(139, 92, 246, 0.15)',
  mint: '#14B8A6',
  mintMuted: 'rgba(20, 184, 166, 0.15)',
  coral: '#EF4444',
  coralMuted: 'rgba(239, 68, 68, 0.15)',

  // Charts & Data Visualization
  chart: {
    primary: '#14B8A6',        // Teal line
    secondary: '#8B5CF6',      // Purple
    tertiary: '#F59E0B',       // Orange
    quaternary: '#EF4444',     // Red
    fifth: '#3B82F6',          // Blue
    sixth: '#10B981',          // Green
    gradientStart: '#14B8A6',
    gradientEnd: 'transparent',
    grid: '#2A2A2A',           // Grid lines
    green: '#10B981',          // Bullish candles
    red: '#EF4444',            // Bearish candles
    orange: '#F59E0B',         // MA(20) indicator
    blue: '#3B82F6',           // MA(50) indicator
    volume: '#374151',         // Volume bars
  },

  // Agent colors (preserved)
  agents: {
    financialReality: '#14B8A6',
    marketContext: '#3B82F6',
    scenarioLearning: '#8B5CF6',
    adaptation: '#F59E0B',
  },

  // Health indicators
  health: {
    excellent: '#10B981',
    strong: '#14B8A6',
    stable: '#3B82F6',
    needsAttention: '#F59E0B',
    critical: '#EF4444',
  },

  // Impact Badges (Market Events)
  impact: {
    high: '#EF4444',
    medium: '#FCD34D',
    low: '#10B981',
  },

  // AI Theme
  ai: {
    primary: '#8B5CF6',
    background: '#2D1B4E',
    border: '#6D28D9',
    text: '#E9D5FF',
  },

  // Button Colors
  button: {
    primary: '#14B8A6',
    primaryText: '#FFFFFF',
    secondary: '#2A2A2A',
    secondaryText: '#FFFFFF',
    danger: '#EF4444',
    dangerText: '#FFFFFF',
    success: '#10B981',
    successText: '#FFFFFF',
    ghost: 'transparent',
    ghostText: '#14B8A6',
  },

  // Interactive States
  pressed: {
    opacity: 0.8,
    scale: 0.98,
  },
  disabled: {
    opacity: 0.5,
  },

  // Shadows (for dark theme)
  shadow: {
    color: '#000000',
    opacity: 0.5,
    radius: 20,
    elevation: 8,
  },
} as const;

export default Colors;
