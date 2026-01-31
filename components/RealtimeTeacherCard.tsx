import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import {
  Mic,
  MicOff,
  BookOpen,
  CheckCircle,
  Circle,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Brain,
  MessageSquare,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from './Card';
import {
  generateLesson,
  generateVoiceResponse,
  LiveTeacherSession,
  getRecommendedLesson,
  assessComprehension,
  type LessonTopic,
  type TeacherSession,
} from '@/lib/realtimeTeacher';

interface RealtimeTeacherCardProps {
  session: TeacherSession;
  onLessonComplete?: (topic: LessonTopic, score: number) => void;
  onSessionUpdate?: (session: TeacherSession) => void;
}

export function RealtimeTeacherCard({
  session,
  onLessonComplete,
  onSessionUpdate,
}: RealtimeTeacherCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Awaited<ReturnType<typeof generateLesson>> | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ questionIndex: number; correct: boolean }[]>([]);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liveSession = useRef<LiveTeacherSession | null>(null);

  const recommendedLesson = getRecommendedLesson(session);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const startLesson = async (topic: LessonTopic) => {
    setIsLoading(true);
    try {
      const lesson = await generateLesson(topic, session);
      setCurrentLesson(lesson);
      setCurrentSection(0);
      setQuizMode(false);
      setQuizAnswers([]);
      setCurrentQuizQuestion(0);

      onSessionUpdate?.({
        ...session,
        currentLesson: topic,
      });
    } catch (error) {
      console.error('Error starting lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      liveSession.current?.disconnect();
      return;
    }

    // Start voice session
    setIsListening(true);
    try {
      liveSession.current = new LiveTeacherSession(session, {
        onMessage: (text) => {
          setCoachResponse(text);
          setIsSpeaking(true);
        },
        onAudio: (audioData) => {
          // Handle audio playback
          console.log('Received audio:', audioData.byteLength, 'bytes');
        },
        onError: (error) => {
          console.error('Live session error:', error);
          setIsListening(false);
        },
      });

      await liveSession.current.connect();
    } catch (error) {
      console.error('Error starting voice session:', error);
      setIsListening(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!userInput.trim()) return;

    setIsLoading(true);
    try {
      const response = await generateVoiceResponse(
        userInput,
        session,
        currentLesson?.sections[currentSection]?.content
      );
      setCoachResponse(response.response);
      setUserInput('');
    } catch (error) {
      console.error('Error getting response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizAnswer = async (answerIndex: number) => {
    if (!currentLesson) return;

    const question = currentLesson.quiz[currentQuizQuestion];
    const isCorrect = answerIndex === question.correctIndex;

    const newAnswers = [...quizAnswers, { questionIndex: currentQuizQuestion, correct: isCorrect }];
    setQuizAnswers(newAnswers);

    // Show feedback
    setCoachResponse(
      isCorrect
        ? `Correct! ${question.explanation}`
        : `Not quite. ${question.explanation}`
    );

    // Move to next question or complete
    if (currentQuizQuestion < currentLesson.quiz.length - 1) {
      setTimeout(() => {
        setCurrentQuizQuestion(currentQuizQuestion + 1);
        setCoachResponse(null);
      }, 3000);
    } else {
      // Quiz complete
      const assessment = await assessComprehension(
        session,
        session.currentLesson!,
        newAnswers
      );

      setCoachResponse(assessment.feedback);
      onLessonComplete?.(session.currentLesson!, assessment.score);
    }
  };

  const LESSON_TITLES: Record<LessonTopic, string> = {
    emergency_fund_basics: 'Emergency Fund Basics',
    budgeting_101: 'Budgeting 101',
    debt_management: 'Debt Management',
    savings_strategies: 'Savings Strategies',
    compound_interest: 'Compound Interest',
    investing_foundations: 'Investing Foundations',
    credit_score: 'Credit Score',
    tax_basics: 'Tax Basics',
  };

  return (
    <View style={styles.wrapper}>
      {/* Stats Card */}
      <Card style={styles.headerCard} variant="elevated">
        <View style={styles.headerRow}>
          <Text style={styles.levelText}>Level: {session.userLevel}</Text>
          <View style={styles.geminiTag}>
            <Sparkles size={12} color={Colors.lavender} />
            <Text style={[styles.geminiText, { color: Colors.lavender }]}>Live API</Text>
          </View>
        </View>

        {/* Progress Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{session.lessonHistory.length}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {session.lessonHistory.filter(l => l.completedAt).length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {session.lessonHistory.length > 0
                ? Math.round(
                    session.lessonHistory.reduce((sum, l) => sum + l.comprehensionScore, 0) /
                    session.lessonHistory.length
                  )
                : 0}%
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>
      </Card>

      {/* Active Lesson or Lesson Selection */}
      {currentLesson ? (
        <Card style={styles.lessonCard}>
          <View style={styles.lessonHeader}>
            <BookOpen size={20} color={Colors.accent} />
            <Text style={styles.lessonTitle}>{currentLesson.title}</Text>
          </View>

          {/* Learning Objectives */}
          <View style={styles.objectivesContainer}>
            <Text style={styles.objectivesTitle}>Learning Objectives</Text>
            {currentLesson.objectives.map((obj, index) => (
              <View key={index} style={styles.objectiveItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.objectiveText}>{obj}</Text>
              </View>
            ))}
          </View>

          {/* Section Content */}
          {!quizMode ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionNav}>
                {currentLesson.sections.map((_, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.sectionDot,
                      index === currentSection && styles.sectionDotActive,
                      index < currentSection && styles.sectionDotComplete,
                    ]}
                    onPress={() => setCurrentSection(index)}
                  />
                ))}
              </View>

              <Text style={styles.sectionName}>
                {currentLesson.sections[currentSection].name}
              </Text>
              <Text style={styles.sectionContent}>
                {currentLesson.sections[currentSection].content}
              </Text>

              <View style={styles.sectionActions}>
                {currentSection < currentLesson.sections.length - 1 ? (
                  <Pressable
                    style={styles.nextButton}
                    onPress={() => setCurrentSection(currentSection + 1)}
                  >
                    <Text style={styles.nextButtonText}>Next Section</Text>
                    <ChevronRight size={18} color={Colors.textLight} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.nextButton, { backgroundColor: Colors.success }]}
                    onPress={() => setQuizMode(true)}
                  >
                    <Text style={styles.nextButtonText}>Take Quiz</Text>
                    <Brain size={18} color={Colors.textLight} />
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            /* Quiz Mode */
            <View style={styles.quizContainer}>
              <Text style={styles.quizProgress}>
                Question {currentQuizQuestion + 1} of {currentLesson.quiz.length}
              </Text>
              <Text style={styles.quizQuestion}>
                {currentLesson.quiz[currentQuizQuestion].question}
              </Text>
              <View style={styles.quizOptions}>
                {currentLesson.quiz[currentQuizQuestion].options.map((option, index) => (
                  <Pressable
                    key={index}
                    style={styles.quizOption}
                    onPress={() => handleQuizAnswer(index)}
                  >
                    <Circle size={18} color={Colors.accent} />
                    <Text style={styles.quizOptionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Card>
      ) : (
        /* Lesson Selection */
        <View>
          <Text style={styles.sectionTitle}>Available Lessons</Text>
          {recommendedLesson && (
            <Pressable
              style={styles.recommendedCard}
              onPress={() => startLesson(recommendedLesson)}
            >
              <View style={styles.recommendedBadge}>
                <Sparkles size={12} color={Colors.textLight} />
                <Text style={styles.recommendedBadgeText}>Recommended</Text>
              </View>
              <Text style={styles.recommendedTitle}>{LESSON_TITLES[recommendedLesson]}</Text>
              <Text style={styles.recommendedDesc}>
                Based on your progress, this is the best next lesson for you.
              </Text>
              <View style={styles.startButton}>
                <Play size={16} color={Colors.textLight} />
                <Text style={styles.startButtonText}>Start Lesson</Text>
              </View>
            </Pressable>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lessonsScroll}>
            {(Object.keys(LESSON_TITLES) as LessonTopic[]).map((topic) => {
              const completed = session.lessonHistory.some(
                l => l.topic === topic && l.completedAt
              );
              return (
                <Pressable
                  key={topic}
                  style={[styles.lessonOption, completed && styles.lessonOptionComplete]}
                  onPress={() => startLesson(topic)}
                  disabled={isLoading}
                >
                  {completed && (
                    <View style={styles.completedBadge}>
                      <CheckCircle size={14} color={Colors.success} />
                    </View>
                  )}
                  <BookOpen size={24} color={completed ? Colors.success : Colors.accent} />
                  <Text style={styles.lessonOptionText}>{LESSON_TITLES[topic]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Voice Interaction */}
      <Card style={styles.voiceCard}>
        <Text style={styles.voiceTitle}>Ask Penny</Text>

        {coachResponse && (
          <View style={styles.responseContainer}>
            <Volume2 size={16} color={Colors.accent} />
            <Text style={styles.responseText}>{coachResponse}</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your question..."
            placeholderTextColor={Colors.textMuted}
            value={userInput}
            onChangeText={setUserInput}
            onSubmitEditing={handleTextSubmit}
          />
          <Pressable
            style={[styles.sendButton, !userInput.trim() && styles.sendButtonDisabled]}
            onPress={handleTextSubmit}
            disabled={!userInput.trim() || isLoading}
          >
            <MessageSquare size={18} color={Colors.textLight} />
          </Pressable>
        </View>

        <View style={styles.voiceRow}>
          <Animated.View style={[styles.micButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <Pressable
              style={[styles.micButton, isListening && styles.micButtonActive]}
              onPress={handleVoiceInput}
            >
              {isListening ? (
                <MicOff size={28} color={Colors.textLight} />
              ) : (
                <Mic size={28} color={isListening ? Colors.textLight : Colors.lavender} />
              )}
            </Pressable>
          </Animated.View>
          <Text style={styles.voiceHint}>
            {isListening ? 'Listening... Tap to stop' : 'Tap to start voice coaching'}
          </Text>
        </View>
      </Card>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },

  headerCard: {
    padding: 20,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  geminiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lavenderMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  geminiText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },

  recommendedCard: {
    backgroundColor: Colors.lavender,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
    marginLeft: 4,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: 6,
  },
  recommendedDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginLeft: 8,
  },

  lessonsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  lessonOption: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lessonOptionComplete: {
    borderWidth: 2,
    borderColor: Colors.success,
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lessonOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 10,
  },

  lessonCard: {
    padding: 20,
    marginBottom: 20,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 10,
  },

  objectivesContainer: {
    backgroundColor: Colors.mintMuted,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  objectivesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 10,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  objectiveText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },

  sectionContainer: {},
  sectionNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  sectionDotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  sectionDotComplete: {
    backgroundColor: Colors.success,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionActions: {
    alignItems: 'flex-end',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginRight: 6,
  },

  quizContainer: {
    marginTop: 10,
  },
  quizProgress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  quizQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  quizOptions: {
    gap: 10,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
  },
  quizOptionText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },

  voiceCard: {
    padding: 20,
  },
  voiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  responseContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lavenderMuted,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  responseText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 10,
    lineHeight: 20,
  },

  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },

  voiceRow: {
    alignItems: 'center',
  },
  micButtonWrapper: {},
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.lavenderMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  micButtonActive: {
    backgroundColor: Colors.coral,
  },
  voiceHint: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
});
