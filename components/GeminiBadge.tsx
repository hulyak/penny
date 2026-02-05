import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Sparkles, Brain, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface GeminiBadgeProps {
  variant?: 'default' | 'inline' | 'large';
  showThinking?: boolean;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export function GeminiBadge({
  variant = 'default',
  showThinking = false,
  thinkingLevel = 'medium'
}: GeminiBadgeProps) {
  if (variant === 'inline') {
    return (
      <View style={styles.inlineBadge}>
        <Sparkles size={12} color={Colors.primary} />
        <Text style={styles.inlineText}>Gemini 3</Text>
      </View>
    );
  }

  if (variant === 'large') {
    return (
      <View style={styles.largeBadge}>
        <View style={styles.largeIconWrapper}>
          <Brain size={24} color="#4285F4" />
        </View>
        <View style={styles.largeContent}>
          <Text style={styles.largeTitle}>Powered by Gemini 3</Text>
          <Text style={styles.largeSubtitle}>
            Google's most capable AI model
          </Text>
          {showThinking && (
            <View style={styles.thinkingRow}>
              <Zap size={12} color={Colors.warning} />
              <Text style={styles.thinkingText}>
                Thinking Level: {thinkingLevel}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <View style={styles.googleColors}>
        <View style={[styles.colorDot, { backgroundColor: '#4285F4' }]} />
        <View style={[styles.colorDot, { backgroundColor: '#EA4335' }]} />
        <View style={[styles.colorDot, { backgroundColor: '#FBBC05' }]} />
        <View style={[styles.colorDot, { backgroundColor: '#34A853' }]} />
      </View>
      <Text style={styles.badgeText}>Gemini 3</Text>
      {showThinking && (
        <View style={styles.thinkingBadge}>
          <Zap size={10} color={Colors.warning} />
        </View>
      )}
    </View>
  );
}

// Animated thinking indicator for streaming responses
export function GeminiThinking({ message = 'Analyzing...' }: { message?: string }) {
  return (
    <View style={styles.thinkingContainer}>
      <View style={styles.thinkingPulse}>
        <Brain size={20} color={Colors.primary} />
      </View>
      <View style={styles.thinkingContent}>
        <Text style={styles.thinkingTitle}>Gemini 3 is thinking</Text>
        <Text style={styles.thinkingMessage}>{message}</Text>
      </View>
    </View>
  );
}

// Feature highlight for demo
export function GeminiFeatureCard({
  title,
  description,
  feature
}: {
  title: string;
  description: string;
  feature: 'reasoning' | 'multimodal' | 'realtime' | 'context';
}) {
  const icons = {
    reasoning: Brain,
    multimodal: Sparkles,
    realtime: Zap,
    context: Sparkles,
  };
  const Icon = icons[feature];

  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Icon size={20} color={Colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <GeminiBadge variant="inline" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  googleColors: {
    flexDirection: 'row',
    gap: 2,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4285F4',
  },
  thinkingBadge: {
    marginLeft: 2,
  },

  // Inline variant
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Large variant
  largeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.2)',
  },
  largeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeContent: {
    flex: 1,
  },
  largeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  largeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  thinkingText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
  },

  // Thinking indicator
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  thinkingPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thinkingContent: {
    flex: 1,
  },
  thinkingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  thinkingMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Feature card
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
