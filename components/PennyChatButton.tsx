import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Text,
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import { PennyChatModal } from './PennyChatModal';

interface PennyChatButtonProps {
  financialContext?: {
    healthScore: number;
    healthLabel: string;
    savingsRate: number;
    monthsOfRunway: number;
    monthlyIncome: number;
    monthlyExpenses: number;
  };
  showHint?: boolean;
}

export function PennyChatButton({ financialContext, showHint = false }: PennyChatButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(showHint);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (showTooltip) {
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        Animated.timing(tooltipAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowTooltip(false));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  return (
    <>
      {/* Tooltip */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipAnim,
              transform: [
                {
                  translateX: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tooltipText}>Need help? Chat with me!</Text>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}

      {/* FAB Button */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Pressable
          style={styles.button}
          onPress={() => {
            setShowTooltip(false);
            setIsChatOpen(true);
          }}
        >
          <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.mascot} />
          <View style={styles.chatBadge}>
            <MessageCircle size={12} color={Colors.textLight} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Chat Modal */}
      <PennyChatModal
        visible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        financialContext={financialContext}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.accentMuted,
  },
  mascot: {
    width: 44,
    height: 44,
  },
  chatBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },

  tooltip: {
    position: 'absolute',
    bottom: 120,
    right: 90,
    backgroundColor: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 1001,
    maxWidth: 180,
  },
  tooltipText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  tooltipArrow: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.text,
  },
});
