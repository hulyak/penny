const ColorsLight = {
  // Light Theme - Monarch-Inspired
  primary: '#10B981', // Teal/green primary
  primaryLight: '#34D399', // Brighter teal
  
  secondary: '#0F766E', // Darker teal
  secondaryLight: '#5EEAD4', // Light cyan
  secondaryDark: '#0D9488',
  
  // Accents - Teal focused
  accent: '#14B8A6', // Bright teal accent
  accentLight: '#5EEAD4',
  accentMuted: '#ECFDF5',
  
  // Functional
  success: '#10B981',
  successLight: '#34D399',
  successMuted: '#ECFDF5',
  
  warning: '#FF6B35', // Orange for spending
  warningLight: '#FBBF24',
  warningMuted: '#FFF7ED',
  
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerMuted: '#FEF2F2',
  
  // Light Theme Neutrals
  neutral: '#1F2937', // Dark text
  neutralLight: '#6B7280', // Medium gray
  neutralMuted: '#F3F4F6', // Light gray backgrounds
  
  background: '#FAFAFA', // Off-white background
  surface: '#FFFFFF', // White cards
  surfaceSecondary: '#F9FAFB', // Slightly darker than background
  
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textLight: '#FFFFFF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',
  
  // Design Elements
  lavender: '#8B5CF6',
  lavenderMuted: '#F5F3FF',
  mint: '#10B981',
  mintMuted: '#ECFDF5',
  coral: '#FF6B35',
  coralMuted: '#FFF1F2',
  
  // Charts & Data
  chart: {
    primary: '#14B8A6',
    secondary: '#9CA3AF',
    tertiary: '#FF6B35',
    quaternary: '#EC4899',
    gradientStart: '#14B8A6',
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

export default ColorsLight;
