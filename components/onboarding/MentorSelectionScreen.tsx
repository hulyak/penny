import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check, Sparkles, TrendingUp, PieChart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useOnboarding, DEFAULT_MENTORS, OnboardingMentor } from '@/context/OnboardingContext';

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

export function MentorSelectionScreen({ onContinue, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { selectedMentor, setSelectedMentor } = useOnboarding();

  const getMentorIcon = (mentorId: string) => {
    switch (mentorId) {
      case 'value-master':
        return <Sparkles size={32} color={Colors.gold} />;
      case 'innovator':
        return <TrendingUp size={32} color={Colors.primary} />;
      case 'diversifier':
        return <PieChart size={32} color={Colors.purple} />;
      default:
        return <Sparkles size={32} color={Colors.primary} />;
    }
  };

  const getMentorColor = (mentorId: string) => {
    switch (mentorId) {
      case 'value-master':
        return Colors.gold;
      case 'innovator':
        return Colors.primary;
      case 'diversifier':
        return Colors.purple;
      default:
        return Colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e1b4b', '#312e81']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your Style</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose Your Investment Style</Text>
        <Text style={styles.subtitle}>
          Learn from AI mentors inspired by legendary investors
        </Text>

        <View style={styles.mentorsContainer}>
          {DEFAULT_MENTORS.map((mentor) => {
            const isSelected = selectedMentor?.id === mentor.id;
            const color = getMentorColor(mentor.id);

            return (
              <Pressable
                key={mentor.id}
                style={[
                  styles.mentorCard,
                  isSelected && styles.mentorCardSelected,
                  isSelected && { borderColor: color },
                ]}
                onPress={() => setSelectedMentor(mentor)}
              >
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: color }]}>
                    <Check size={16} color="#fff" />
                  </View>
                )}

                <View style={styles.mentorHeader}>
                  {mentor.imageUrl ? (
                    <Image
                      source={{ uri: mentor.imageUrl }}
                      style={styles.mentorImage}
                    />
                  ) : (
                    <View style={[styles.mentorIconContainer, { backgroundColor: color + '20' }]}>
                      {getMentorIcon(mentor.id)}
                    </View>
                  )}
                  <View style={styles.mentorInfo}>
                    <Text style={styles.mentorName}>{mentor.name}</Text>
                    <Text style={styles.mentorDescription}>{mentor.description}</Text>
                  </View>
                </View>

                <View style={styles.quoteContainer}>
                  <Text style={styles.quote}>{`"${mentor.quote}"`}</Text>
                </View>

                <View style={styles.focusContainer}>
                  <Text style={styles.focusLabel}>Focus:</Text>
                  <Text style={styles.focusText}>{mentor.focus}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.reassurance}>You can change this anytime</Text>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={[
            styles.ctaButton,
            !selectedMentor && styles.ctaButtonDisabled,
          ]}
          onPress={onContinue}
          disabled={!selectedMentor}
        >
          <Text style={styles.ctaText}>Start Learning</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  mentorsContainer: {
    gap: 16,
  },
  mentorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mentorCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mentorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mentorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  mentorDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  quote: {
    fontSize: 15,
    fontStyle: 'italic',
    color: Colors.text,
    lineHeight: 22,
  },
  focusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  focusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  focusText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  reassurance: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
