const Colors = {
  // Brand Colors - Sophisticated Financial Tech
  primary: '#064E3B', // Darker, richer forest green
  primaryLight: '#34D399', // Bright emerald for contrast
  
  secondary: '#10B981', // Standard success green
  secondaryLight: '#D1FAE5', // Very light mint
  secondaryDark: '#047857',
  
  // Accents - Used sparingly
  accent: '#3B82F6', // Trustworthy Blue
  accentLight: '#BFDBFE',
  accentMuted: '#EFF6FF',
  
  // Functional
  success: '#059669',
  successLight: '#34D399',
  successMuted: '#ECFDF5',
  
  warning: '#D97706',
  warningLight: '#FBBF24',
  warningMuted: '#FFFBEB',
  
  danger: '#DC2626',
  dangerLight: '#F87171',
  dangerMuted: '#FEF2F2',
  
  // Neutrals - Modern & Clean
  neutral: '#1F2937', // Near black for text
  neutralLight: '#6B7280', // Gray for secondary text
  neutralMuted: '#F3F4F6', // Light gray backgrounds
  
  background: '#F9FAFB', // Cool clean background
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC', // Slightly distinct surface
  
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textLight: '#FFFFFF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#F3F4F6',
  
  // Design Elements
  lavender: '#8B5CF6',
  lavenderMuted: '#F5F3FF',
  mint: '#10B981',
  mintMuted: '#ECFDF5',
  coral: '#F43F5E',
  coralMuted: '#FFF1F2',
  
  // Charts & Data
  chart: {
    primary: '#10B981',
    secondary: '#3B82F6',
    tertiary: '#F59E0B',
    quaternary: '#EC4899',
    gradientStart: '#10B981',
    gradientEnd: '#6EE7B7',
  },

  // Agent Specific
  agents: {
    financialReality: '#10B981',
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
