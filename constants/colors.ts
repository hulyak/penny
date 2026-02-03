const Colors = {
  // Dark Theme - Modern Financial App
  primary: '#0D9488', // Teal/Cyan primary
  primaryLight: '#14B8A6', // Brighter teal
  
  secondary: '#0F766E', // Darker teal
  secondaryLight: '#5EEAD4', // Light cyan
  secondaryDark: '#0D9488',
  
  // Accents - Teal/Cyan focused
  accent: '#14B8A6', // Bright teal accent
  accentLight: '#5EEAD4',
  accentMuted: '#134E4A',
  
  // Functional
  success: '#10B981',
  successLight: '#34D399',
  successMuted: '#064E3B',
  
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningMuted: '#78350F',
  
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerMuted: '#7F1D1D',
  
  // Dark Theme Neutrals
  neutral: '#E5E7EB', // Light text on dark
  neutralLight: '#9CA3AF', // Muted text
  neutralMuted: '#1F2937', // Dark card backgrounds
  
  background: '#000000', // Pure black background
  surface: '#1F2937', // Dark gray for cards
  surfaceSecondary: '#111827', // Slightly lighter than background
  
  text: '#FFFFFF',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textLight: '#FFFFFF',
  
  border: '#374151',
  borderLight: '#1F2937',
  divider: '#374151',
  
  // Design Elements
  lavender: '#8B5CF6',
  lavenderMuted: '#4C1D95',
  mint: '#10B981',
  mintMuted: '#064E3B',
  coral: '#F43F5E',
  coralMuted: '#881337',
  
  // Charts & Data
  chart: {
    primary: '#14B8A6',
    secondary: '#3B82F6',
    tertiary: '#F59E0B',
    quaternary: '#EC4899',
    gradientStart: '#0D9488',
    gradientEnd: '#5EEAD4',
  },

  // Agent Specific
  agents: {
    financialReality: '#14B8A6',
    marketContext: '#3B82F6',
    scenarioLearning: '#8B5CF6',
    adaptation: '#F59E0B',
  },
  
  health: {
    critical: '#EF4444',
    needsAttention: '#F59E0B',
    stable: '#3B82F6',
    strong: '#10B981',
    excellent: '#059669',
  },
} as const;

export default Colors;
