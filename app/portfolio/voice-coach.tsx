import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { playTextToSpeech } from '@/lib/elevenLabs';
import * as Speech from 'expo-speech'; // Fallback
import {
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Brain,
  Sparkles,
  MessageCircle,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { generateWithGemini, streamWithGemini, GEMINI_SYSTEM_PROMPT } from '@/lib/gemini';
import { GeminiBadge } from '@/components/GeminiBadge';
import { usePurchases } from '@/context/PurchasesContext';
import { PremiumCard } from '@/components/PremiumBadge';
import portfolioService from '@/lib/portfolioService';
import { Holding } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function VoiceCoachScreen() {
  const router = useRouter();
  const { isPremium, showPaywall } = usePurchases();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    loadPortfolioContext();
    addWelcomeMessage();

    return () => {
      // Cleanup
      Speech.stop();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      // Pulse animation when listening
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const loadPortfolioContext = async () => {
    try {
      const data = await portfolioService.getLocalHoldings();
      setHoldings(data);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI portfolio coach powered by Gemini 3. Tap the microphone and ask me anything about your investments. I can explain your portfolio, discuss strategies, or help you understand market concepts.",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);

    // Speak the welcome message using ElevenLabs
    if (!isMuted) {
      setIsSpeaking(true);
      playTextToSpeech(welcomeMessage.content)
        .then(() => setIsSpeaking(false))
        .catch(() => {
          // Fallback to expo-speech if ElevenLabs fails
          Speech.speak(welcomeMessage.content, {
            onDone: () => setIsSpeaking(false),
          });
        });
    }
  };

  const getPortfolioContext = () => {
    if (holdings.length === 0) return 'The user has no holdings yet.';

    const totalValue = holdings.reduce((sum, h) =>
      sum + (h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice)), 0
    );

    const holdingsSummary = holdings.map(h => {
      const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
      return `- ${h.name} (${h.symbol || h.type}): ${h.quantity} units, worth $${value.toLocaleString()}`;
    }).join('\n');

    return `User's Portfolio Summary:
Total Value: $${totalValue.toLocaleString()}
Number of Holdings: ${holdings.length}

Holdings:
${holdingsSummary}`;
  };

  const startListening = async () => {
    try {
      setError(null);

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission required');
        return;
      }

      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsListening(true);
      setCurrentTranscript('Listening...');

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopListening = async () => {
    if (!recordingRef.current) return;

    setIsListening(false);
    setCurrentTranscript('Processing...');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        // For demo purposes, we'll simulate speech-to-text
        // In production, you'd send the audio to Google Cloud Speech-to-Text
        await processAudioInput(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to process recording');
      setCurrentTranscript('');
    }
  };

  const processAudioInput = async (audioUri: string) => {
    // Simulate speech-to-text (in production, use Google Cloud Speech-to-Text API)
    // For hackathon demo, we'll use a simulated transcript
    const simulatedQuestions = [
      "How is my portfolio doing?",
      "What should I invest in?",
      "Explain my asset allocation",
      "Am I diversified enough?",
      "What's my biggest holding?",
    ];

    // For demo, randomly select a question to simulate voice input
    const transcript = simulatedQuestions[Math.floor(Math.random() * simulatedQuestions.length)];
    setCurrentTranscript('');

    await handleUserMessage(transcript);
  };

  const handleUserMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Create streaming assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const portfolioContext = getPortfolioContext();
      const prompt = `${portfolioContext}

User's question: ${content}

Provide a helpful, conversational response. Keep it concise (2-3 sentences max) since this will be spoken aloud. Be encouraging but honest. Remember: never give specific investment advice.`;

      let fullResponse = '';

      await streamWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        thinkingLevel: 'medium',
        onChunk: (chunk) => {
          fullResponse += chunk;
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: fullResponse }
              : m
          ));
          scrollViewRef.current?.scrollToEnd({ animated: true });
        },
        onComplete: (finalText) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: finalText, isStreaming: false }
              : m
          ));

          // Speak the response using ElevenLabs
          if (!isMuted) {
            setIsSpeaking(true);
            playTextToSpeech(finalText)
              .then(() => setIsSpeaking(false))
              .catch(() => {
                // Fallback to expo-speech
                Speech.speak(finalText, {
                  onDone: () => setIsSpeaking(false),
                });
              });
          }
        },
      });
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: "I'm having trouble processing that. Please try again.", isStreaming: false }
          : m
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMute = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  const handleQuickQuestion = (question: string) => {
    if (isProcessing) return;
    handleUserMessage(question);
  };

  // Premium gate - show upgrade prompt for non-premium users
  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Voice Coach</Text>
            <GeminiBadge variant="inline" />
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.premiumGateContainer}>
          <View style={styles.premiumGateIcon}>
            <Mic size={48} color={Colors.primary} />
          </View>
          <Text style={styles.premiumGateTitle}>AI Voice Coaching</Text>
          <Text style={styles.premiumGateSubtitle}>
            Get real-time portfolio advice through voice conversations powered by Gemini 3
          </Text>
          <PremiumCard
            title="Unlock Voice Coach"
            description="Talk to your AI financial coach, ask questions about your portfolio, and get personalized guidance."
            onUpgrade={showPaywall}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Voice Coach</Text>
          <GeminiBadge variant="inline" />
        </View>
        <Pressable onPress={toggleMute} style={styles.muteButton}>
          {isMuted ? (
            <VolumeX size={24} color={Colors.textMuted} />
          ) : (
            <Volume2 size={24} color={Colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Gemini 3 Feature Card */}
      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Brain size={24} color="#4285F4" />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>Real-Time AI Coaching</Text>
          <Text style={styles.featureSubtitle}>
            Powered by Gemini 3 with advanced reasoning
          </Text>
          <View style={styles.thinkingBadge}>
            <Zap size={12} color={Colors.warning} />
            <Text style={styles.thinkingText}>Thinking: medium</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.assistantIcon}>
                <Sparkles size={16} color={Colors.primary} />
              </View>
            )}
            <View style={[
              styles.messageContent,
              message.role === 'user' && styles.userMessageContent
            ]}>
              <Text style={[
                styles.messageText,
                message.role === 'user' && styles.userMessageText
              ]}>
                {message.content}
                {message.isStreaming && <Text style={styles.cursor}>|</Text>}
              </Text>
            </View>
          </View>
        ))}

        {/* Speaking indicator */}
        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <Volume2 size={14} color={Colors.primary} />
            <Text style={styles.speakingText}>Speaking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Questions */}
      <View style={styles.quickQuestions}>
        <Text style={styles.quickQuestionsLabel}>Quick questions:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={styles.quickQuestion}
            onPress={() => handleQuickQuestion("How is my portfolio doing?")}
          >
            <Text style={styles.quickQuestionText}>Portfolio health?</Text>
          </Pressable>
          <Pressable
            style={styles.quickQuestion}
            onPress={() => handleQuickQuestion("Am I properly diversified?")}
          >
            <Text style={styles.quickQuestionText}>Am I diversified?</Text>
          </Pressable>
          <Pressable
            style={styles.quickQuestion}
            onPress={() => handleQuickQuestion("Explain my asset allocation")}
          >
            <Text style={styles.quickQuestionText}>Asset allocation</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Voice Input Area */}
      <View style={styles.inputArea}>
        {currentTranscript ? (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcript}>{currentTranscript}</Text>
          </View>
        ) : null}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.micContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
                isProcessing && styles.micButtonProcessing,
              ]}
              onPressIn={startListening}
              onPressOut={stopListening}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={Colors.textLight} size="large" />
              ) : isListening ? (
                <Mic size={32} color={Colors.textLight} />
              ) : (
                <MicOff size={32} color={Colors.textLight} />
              )}
            </Pressable>
          </Animated.View>
          <Text style={styles.micHint}>
            {isProcessing
              ? 'Gemini 3 is thinking...'
              : isListening
                ? 'Listening... release to send'
                : 'Hold to speak'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  muteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.2)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  featureSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  thinkingBadge: {
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

  messagesContainer: {
    flex: 1,
    marginTop: 16,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  assistantIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '80%',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  userMessageContent: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.textLight,
  },
  cursor: {
    color: Colors.primary,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 40,
  },
  speakingText: {
    fontSize: 12,
    color: Colors.primary,
  },

  quickQuestions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickQuestionsLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  quickQuestion: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickQuestionText: {
    fontSize: 13,
    color: Colors.text,
  },

  inputArea: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  transcriptContainer: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  transcript: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  micContainer: {
    alignItems: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
  },
  micButtonProcessing: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
  },
  micHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 12,
  },

  // Premium gate styles
  premiumGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumGateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumGateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  premiumGateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
});
