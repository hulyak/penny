const Colors = {
  // Modern Finance App - Premium Dark Theme
  // Inspired by Robinhood, Wealthfront, and Bloomberg Terminal

  primary: '#00D09C', // Mint green - finance apps love this
  primaryLight: '#00E6AC',
  primaryDark: '#00B386',

  secondary: '#5B5FEF', // Purple accent for premium feel
  secondaryLight: '#7B7FF2',
  secondaryDark: '#4547C9',

  // Accent colors
  accent: '#00D09C', // Same as primary - mint green
  accentLight: '#33DBAF',
  accentMuted: 'rgba(0, 208, 156, 0.15)',

  // Functional colors with finance-friendly shades
  success: '#00D09C', // Green for gains
  successLight: '#33DBAF',
  successMuted: 'rgba(0, 208, 156, 0.15)',

  warning: '#FFB020', // Amber for warnings
  warningLight: '#FFC04D',
  warningMuted: 'rgba(255, 176, 32, 0.15)',

  danger: '#FF6B6B', // Soft red for losses/danger
  dangerLight: '#FF8A8A',
  dangerMuted: 'rgba(255, 107, 107, 0.15)',

  // Dark Theme Neutrals - Rich, deep backgrounds
  neutral: '#E2E8F0',
  neutralLight: '#A0AEC0',
  neutralMuted: '#1C2333',

  background: '#0A0E17', // Deep navy-black
  backgroundSecondary: '#0F1419',
  surface: '#151B26', // Card backgrounds
  surfaceSecondary: '#1C2333', // Elevated surfaces
  surfaceHighlight: '#232D3F', // Hover/active states

  // Text colors with good contrast
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted: '#718096',
  textLight: '#FFFFFF',
  textInverse: '#0A0E17',

  // Borders and dividers
  border: '#2D3748',
  borderLight: '#1C2333',
  divider: '#2D3748',

  // Premium accent colors
  gold: '#F7B955',
  goldMuted: 'rgba(247, 185, 85, 0.15)',

  purple: '#9F7AEA',
  purpleMuted: 'rgba(159, 122, 234, 0.15)',

  blue: '#4299E1',
  blueMuted: 'rgba(66, 153, 225, 0.15)',

  cyan: '#0BC5EA',
  cyanMuted: 'rgba(11, 197, 234, 0.15)',

  // Legacy compatibility
  lavender: '#9F7AEA',
  lavenderMuted: 'rgba(159, 122, 234, 0.15)',
  mint: '#00D09C',
  mintMuted: 'rgba(0, 208, 156, 0.15)',
  coral: '#FF6B6B',
  coralMuted: 'rgba(255, 107, 107, 0.15)',

  // Charts & Data Visualization
  chart: {
    primary: '#00D09C',
    secondary: '#5B5FEF',
    tertiary: '#F7B955',
    quaternary: '#FF6B6B',
    fifth: '#4299E1',
    sixth: '#9F7AEA',
    gradientStart: '#00D09C',
    gradientEnd: '#00B386',
  },

  // Legacy agent colors
  agents: {
    financialReality: '#00D09C',
    marketContext: '#4299E1',
    scenarioLearning: '#9F7AEA',
    adaptation: '#F7B955',
  },

  // Health indicators
  health: {
    excellent: '#00D09C',
    strong: '#00D09C',
    stable: '#4299E1',
    needsAttention: '#FFB020',
    critical: '#FF6B6B',
  },
} as const;

export default Colors;
