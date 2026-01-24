import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { 
  X, 
  CheckCircle, 
  AlertCircle,
  Circle,
  Volume2,
} from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import Colors from '@/constants/colors';
import * as Speech from 'expo-speech';

import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

export function InvestmentReadinessModal() {
  const { showReadinessModal, setShowReadinessModal, currentReadiness } = useCoach();

  if (!currentReadiness) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'met':
        return <CheckCircle size={18} color={Colors.success} />;
      case 'partial':
        return <AlertCircle size={18} color={Colors.warning} />;
      default:
        return <Circle size={18} color={Colors.textMuted} />;
    }
  };

  const getScoreColor = () => {
    if (currentReadiness.score >= 70) return Colors.success;
    if (currentReadiness.score >= 50) return Colors.warning;
    return Colors.danger;
  };

  const speakSummary = () => {
    const text = `Your readiness score is ${currentReadiness.score} out of 100. ${currentReadiness.isReady ? 'You appear ready to start learning about investing.' : 'Focus on building your foundation first.'} ${currentReadiness.recommendation}`;
    Speech.speak(text, { language: 'en', rate: 0.9 });
  };

  return (
    <Modal
      visible={showReadinessModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowReadinessModal(false)}
    >
      <View style={styles.overlay}>
        <Pressable 
          style={styles.backdrop} 
          onPress={() => setShowReadinessModal(false)}
        />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Investment Readiness</Text>
            <Pressable 
              style={styles.closeButton}
              onPress={() => setShowReadinessModal(false)}
            >
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.scoreSection}>
              <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor() }]}>
                  {currentReadiness.score}
                </Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <Text style={[styles.readinessLabel, { color: getScoreColor() }]}>
                {currentReadiness.isReady ? 'Ready to Learn!' : 'Building Foundation'}
              </Text>
            </View>

            <View style={styles.factorsSection}>
              <Text style={styles.sectionTitle}>Readiness Factors</Text>
              {currentReadiness.factors.map((factor, index) => (
                <View key={index} style={styles.factorCard}>
                  <View style={styles.factorHeader}>
                    {getStatusIcon(factor.status)}
                    <Text style={styles.factorName}>{factor.name}</Text>
                  </View>
                  <Text style={styles.factorDescription}>{factor.description}</Text>
                </View>
              ))}
            </View>

            <View style={styles.mascotSection}>
              <Image source={{ uri: MASCOT_URL }} style={styles.mascot} />
              <View style={styles.mascotBubble}>
                <Text style={styles.recommendationText}>
                  {currentReadiness.recommendation}
                </Text>
                <Pressable style={styles.speakButton} onPress={speakSummary}>
                  <Volume2 size={14} color={Colors.accent} />
                  <Text style={styles.speakButtonText}>Listen</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.nextStepsSection}>
              <Text style={styles.sectionTitle}>Next Steps</Text>
              {currentReadiness.nextSteps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                This is an educational assessment, not financial advice. Consider consulting a qualified financial advisor for personalized guidance.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable 
              style={styles.dismissButton}
              onPress={() => setShowReadinessModal(false)}
            >
              <Text style={styles.dismissButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: -4,
  },
  readinessLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  factorsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  factorCard: {
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  factorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  factorDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginLeft: 28,
  },
  mascotSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  mascot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  mascotBubble: {
    flex: 1,
    backgroundColor: Colors.accentMuted,
    padding: 14,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    gap: 4,
  },
  speakButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.accent,
  },
  nextStepsSection: {
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingTop: 2,
  },
  disclaimer: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dismissButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
