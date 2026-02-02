/**
 * Feedback Button Component
 *
 * Allows users to rate AI responses as helpful/not helpful.
 * Integrates with Opik for tracking.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trackFeedback } from '@/lib/analytics';

interface FeedbackButtonProps {
  traceId: string;
  feature: string;
  compact?: boolean;
  onFeedback?: (rating: 'helpful' | 'not_helpful') => void;
}

export function FeedbackButton({
  traceId,
  feature,
  compact = false,
  onFeedback,
}: FeedbackButtonProps) {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleFeedback = async (value: 'helpful' | 'not_helpful') => {
    if (submitted) return;

    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setRating(value);
    setSubmitted(true);

    // Track feedback
    await trackFeedback({
      traceId,
      rating: value,
      feature,
    });

    onFeedback?.(value);
  };

  if (submitted) {
    return (
      <Animated.View
        style={[
          styles.container,
          compact && styles.containerCompact,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.thankYouContainer}>
          <Check size={16} color={Colors.success} />
          <Text style={styles.thankYouText}>Thanks for your feedback!</Text>
        </View>
      </Animated.View>
    );
  }

  if (compact) {
    return (
      <View style={[styles.container, styles.containerCompact]}>
        <Pressable
          style={[styles.iconButton, styles.iconButtonCompact]}
          onPress={() => handleFeedback('helpful')}
        >
          <ThumbsUp size={14} color={Colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.iconButton, styles.iconButtonCompact]}
          onPress={() => handleFeedback('not_helpful')}
        >
          <ThumbsDown size={14} color={Colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Was this helpful?</Text>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.helpfulButton]}
          onPress={() => handleFeedback('helpful')}
        >
          <ThumbsUp size={18} color={Colors.success} />
          <Text style={[styles.buttonText, { color: Colors.success }]}>Yes</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.notHelpfulButton]}
          onPress={() => handleFeedback('not_helpful')}
        >
          <ThumbsDown size={18} color={Colors.danger} />
          <Text style={[styles.buttonText, { color: Colors.danger }]}>No</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Inline feedback for chat messages
 */
export function InlineFeedback({
  traceId,
  feature,
}: {
  traceId: string;
  feature: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (value: 'helpful' | 'not_helpful') => {
    if (submitted) return;
    setSubmitted(true);

    await trackFeedback({
      traceId,
      rating: value,
      feature,
    });
  };

  if (submitted) {
    return (
      <View style={styles.inlineContainer}>
        <Check size={12} color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      <Pressable
        style={styles.inlineButton}
        onPress={() => handleFeedback('helpful')}
      >
        <ThumbsUp size={12} color={Colors.textMuted} />
      </Pressable>
      <Pressable
        style={styles.inlineButton}
        onPress={() => handleFeedback('not_helpful')}
      >
        <ThumbsDown size={12} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  helpfulButton: {
    borderColor: Colors.successMuted,
    backgroundColor: Colors.successMuted + '20',
  },
  notHelpfulButton: {
    borderColor: Colors.dangerMuted,
    backgroundColor: Colors.dangerMuted + '20',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
  },
  iconButtonCompact: {
    padding: 6,
  },
  thankYouContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thankYouText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  inlineButton: {
    padding: 4,
  },
});

export default FeedbackButton;
