import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import { type CelebrationData } from '@/lib/milestones';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 50;

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  color: string;
  size: number;
}

interface CelebrationModalProps {
  visible: boolean;
  celebration: CelebrationData | null;
  onClose: () => void;
}

export function CelebrationModal({ visible, celebration, onClose }: CelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiPieces = useRef<ConfettiPiece[]>([]).current;

  useEffect(() => {
    if (visible && celebration) {
      // Initialize confetti
      confettiPieces.length = 0;
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        confettiPieces.push({
          id: i,
          x: new Animated.Value(Math.random() * SCREEN_WIDTH),
          y: new Animated.Value(-50 - Math.random() * 200),
          rotate: new Animated.Value(0),
          color: celebration.confettiColors[i % celebration.confettiColors.length],
          size: 8 + Math.random() * 8,
        });
      }

      // Animate entrance
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Animate confetti
      confettiPieces.forEach((piece, index) => {
        const delay = index * 30;
        const duration = 2000 + Math.random() * 1000;

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(piece.y, {
              toValue: SCREEN_HEIGHT + 100,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(piece.x, {
              toValue: Math.random() * SCREEN_WIDTH,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(piece.rotate, {
              toValue: Math.random() * 10,
              duration,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, celebration]);

  if (!celebration) return null;

  const { milestone, message, badge } = celebration;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {confettiPieces.map((piece) => (
          <Animated.View
            key={piece.id}
            style={[
              styles.confetti,
              {
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size * 1.5,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  {
                    rotate: piece.rotate.interpolate({
                      inputRange: [0, 10],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Celebration Card */}
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={20} color={Colors.textMuted} />
          </Pressable>

          {/* Badge & Icon */}
          <View style={styles.badgeContainer}>
            <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
            {badge && <Text style={styles.badge}>{badge}</Text>}
          </View>

          {/* Title */}
          <Text style={styles.congratsText}>Congratulations!</Text>
          <Text style={styles.milestoneTitle}>{milestone.title}</Text>

          {/* Mascot */}
          <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.mascot} />

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Achievement Details */}
          <View style={styles.achievementBox}>
            <Text style={styles.achievementLabel}>Achievement Unlocked</Text>
            <Text style={styles.achievementValue}>
              {milestone.current} {milestone.unit}
            </Text>
          </View>

          {/* Close Button */}
          <Pressable style={styles.celebrateButton} onPress={onClose}>
            <Text style={styles.celebrateButtonText}>Keep Going! 🚀</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  milestoneIcon: {
    fontSize: 48,
  },
  badge: {
    fontSize: 32,
  },
  congratsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  mascot: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  achievementBox: {
    backgroundColor: Colors.successMuted,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  achievementLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  achievementValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
  },
  celebrateButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
  },
  celebrateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textLight,
    textAlign: 'center',
  },
});
