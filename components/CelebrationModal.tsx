import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import { X, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';

// Define CelebrationData locally (previously from milestones)
export interface MilestoneData {
  icon: string;
  title: string;
  current: number;
  unit: string;
}

export interface CelebrationData {
  milestone: MilestoneData;
  message: string;
  badge?: string;
  confettiColors: string[];
}

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
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

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

  const handleShare = async () => {
    if (!celebration) return;

    setIsSharing(true);
    try {
      // Try to capture and share as image
      if (cardRef.current) {
        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
        });

        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
          const filename = `achievement-${Date.now()}.png`;
          const newPath = `${cacheDirectory}${filename}`;
          await copyAsync({ from: uri, to: newPath });

          await Sharing.shareAsync(newPath, {
            mimeType: 'image/png',
            dialogTitle: 'Share your achievement!',
            UTI: 'public.png',
          });
        } else {
          // Fallback to text sharing
          await shareAsText();
        }
      } else {
        await shareAsText();
      }
    } catch (error) {
      console.error('Share error:', error);
      await shareAsText();
    } finally {
      setIsSharing(false);
    }
  };

  const shareAsText = async () => {
    if (!celebration) return;

    await Share.share({
      message: `${celebration.milestone.icon} Achievement Unlocked!\n\n"${celebration.milestone.title}"\n\n${celebration.milestone.current} ${celebration.milestone.unit} achieved!\n\nTracking my portfolio with Penny 📊`,
    });
  };

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
          <View ref={cardRef} collapsable={false} style={styles.shareableCard}>
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

          {/* App Branding for Share */}
          <View style={styles.brandingRow}>
            <Text style={styles.brandingText}>📊 Tracked with Penny</Text>
          </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
              onPress={handleShare}
              disabled={isSharing}
            >
              <Share2 size={18} color={Colors.accent} />
              <Text style={styles.shareButtonText}>
                {isSharing ? 'Sharing...' : 'Share'}
              </Text>
            </Pressable>
            <Pressable style={styles.celebrateButton} onPress={onClose}>
              <Text style={styles.celebrateButtonText}>Keep Going! 🚀</Text>
            </Pressable>
          </View>
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
  shareableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  brandingRow: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  brandingText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
  celebrateButton: {
    flex: 2,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
  },
  celebrateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textLight,
    textAlign: 'center',
  },
});
