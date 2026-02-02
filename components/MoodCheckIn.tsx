import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import {
  recordUserMood,
  generateMoodBasedResponse,
  type DailyCoachState,
  type FinancialContext,
} from '@/lib/dailyCoach';

interface MoodCheckInProps {
  visible: boolean;
  onClose: () => void;
  context: FinancialContext;
}

const MOODS: { value: DailyCoachState['userMood']; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great!' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'stressed', emoji: '😰', label: 'Stressed' },
];

export function MoodCheckIn({ visible, onClose, context }: MoodCheckInProps) {
  const [selectedMood, setSelectedMood] = useState<DailyCoachState['userMood']>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMoodSelect = async (mood: DailyCoachState['userMood']) => {
    setSelectedMood(mood);
    setIsLoading(true);

    try {
      await recordUserMood(mood);
      const pennyResponse = await generateMoodBasedResponse(mood, context);
      setResponse(pennyResponse);
    } catch (error) {
      console.error('[MoodCheckIn] Error:', error);
      setResponse("Thanks for sharing! Remember, every day is a new opportunity to make progress.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMood(null);
    setResponse(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={20} color={Colors.textMuted} />
          </Pressable>

          <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.mascot} />

          {!selectedMood ? (
            <>
              <Text style={styles.title}>How are you feeling about your finances today?</Text>
              <Text style={styles.subtitle}>Be honest - there's no wrong answer!</Text>

              <View style={styles.moodGrid}>
                {MOODS.map((mood) => (
                  <Pressable
                    key={mood.value}
                    style={styles.moodButton}
                    onPress={() => handleMoodSelect(mood.value)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.selectedMoodContainer}>
                <Text style={styles.selectedEmoji}>
                  {MOODS.find(m => m.value === selectedMood)?.emoji}
                </Text>
              </View>

              {isLoading ? (
                <Text style={styles.loadingText}>Penny is thinking...</Text>
              ) : (
                <>
                  <Text style={styles.responseText}>{response}</Text>
                  <Pressable style={styles.doneButton} onPress={handleClose}>
                    <Text style={styles.doneButtonText}>Thanks, Penny!</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  moodButton: {
    width: 72,
    height: 80,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  selectedMoodContainer: {
    marginBottom: 16,
  },
  selectedEmoji: {
    fontSize: 48,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  responseText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
