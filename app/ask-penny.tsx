import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Send,
  TrendingUp,
  Target,
  DollarSign,
  Rocket,
  Mic,
  Volume2,
  VolumeX,
  Trash2,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { playTextToSpeech, stopTextToSpeech } from '@/lib/elevenLabs';
import Colors from '@/constants/colors';
import haptics from '@/lib/haptics';
import { generateWithGemini } from '@/lib/gemini';
import { useAuth } from '@/context/AuthContext';
import { usePortfolioData } from '@/hooks/usePortfolioData';

const CHAT_HISTORY_KEY = 'penny_chat_history';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  {
    id: 'health',
    title: 'Portfolio Health Check',
    icon: TrendingUp,
    color: Colors.primary,
  },
  {
    id: 'rebalance',
    title: 'Rebalance Suggestions',
    icon: Target,
    color: Colors.purple,
  },
  {
    id: 'tax',
    title: 'Tax Optimization',
    icon: DollarSign,
    color: Colors.success,
  },
  {
    id: 'growth',
    title: 'Growth Opportunities',
    icon: Rocket,
    color: Colors.blue,
  },
];

export default function AskPennyScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const { holdings, summary } = usePortfolioData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Stop voice when navigating away
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        Speech.stop();
        stopTextToSpeech();
        setIsSpeaking(false);
      };
    }, [])
  );

  const loadChatHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('[AskPenny] Failed to load chat history:', error);
    }
  };

  const saveChatHistory = async (msgs: Message[]) => {
    try {
      // Keep only last 50 messages to avoid storage bloat
      const toSave = msgs.slice(-50);
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('[AskPenny] Failed to save chat history:', error);
    }
  };

  const clearChatHistory = async () => {
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
      setMessages([]);
      haptics.lightTap();
    } catch (error) {
      console.error('[AskPenny] Failed to clear chat history:', error);
    }
  };

  // Pulse animation for mic button
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    try {
      // Try ElevenLabs first (better voice quality)
      await playTextToSpeech(text);
      setIsSpeaking(false);
    } catch (err) {
      // Fallback to device speech if ElevenLabs fails
      console.log('[AskPenny] ElevenLabs failed, using device speech');
      Speech.speak(text, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const stopSpeaking = async () => {
    Speech.stop();
    await stopTextToSpeech();
    setIsSpeaking(false);
  };

  const startListening = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Microphone permission required');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsListening(true);
      haptics.lightTap();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopListening = async () => {
    if (!recordingRef.current) return;
    setIsListening(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      // For demo: simulate voice input with common questions
      const questions = ["How is my portfolio doing?", "Should I rebalance?", "What's my best performing stock?"];
      const simulatedText = questions[Math.floor(Math.random() * questions.length)];
      setInputText(simulatedText);
      haptics.lightTap();
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const handleSend = async () => {
    if (inputText.trim() && !isLoading) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        isUser: true,
        timestamp: new Date(),
      };
      
      const userQuestion = inputText.trim();
      setMessages([...messages, userMessage]);
      setInputText('');
      setIsLoading(true);
      haptics.lightTap();

      try {
        // Build context about user's portfolio
        const portfolioContext = `
User's Portfolio Summary:
- Total Value: $${summary.totalValue.toFixed(2)}
- Total Gain: $${summary.totalGain.toFixed(2)} (${summary.totalGainPercent.toFixed(2)}%)
- Number of Holdings: ${holdings.length}

Holdings:
${holdings.map(h => {
  const currentPrice = h.currentPrice || h.purchasePrice;
  const currentValue = h.quantity * currentPrice;
  const gainPercent = h.purchasePrice > 0 ? ((currentPrice - h.purchasePrice) / h.purchasePrice * 100) : 0;
  return `- ${h.name} (${h.symbol || 'N/A'}): ${h.quantity} shares, Current Value: $${currentValue.toFixed(2)}, Gain: ${gainPercent.toFixed(2)}%`;
}).join('\n')}
`;

        const systemPrompt = `You are Penny, a friendly and knowledgeable AI financial advisor. You help users make informed investment decisions.

Your personality:
- Supportive and encouraging
- Clear and concise
- Educational but not condescending
- Always consider the user's current portfolio

IMPORTANT: Do NOT use any markdown formatting. No headers (###), no bold (**), no italic (*), no bullet points (-). Write in plain conversational text only. Use line breaks for separation.

When giving advice:
- Consider their current holdings and diversification
- Explain reasoning simply
- Mention risks when relevant
- Suggest specific actions when appropriate

${portfolioContext}`;

        console.log('[AskPenny] Sending question to Gemini:', userQuestion);

        const aiResponseText = await generateWithGemini({
          prompt: userQuestion,
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxTokens: 1500,
          thinkingLevel: 'medium',
          feature: `ask_penny_chat_${Date.now()}`, // Unique feature to bypass cache
        });

        console.log('[AskPenny] Got response:', aiResponseText?.substring(0, 100));

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);

        // Auto-speak the response
        speakResponse(aiResponseText);
      } catch (error: any) {
        console.error('[AskPenny] AI response error:', error);
        const errorText = error?.message || String(error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I couldn't process that. Error: ${errorText.substring(0, 100)}. Please check your internet connection and try again.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleQuickAction = (actionId: string) => {
    haptics.lightTap();
    const actionTexts: Record<string, string> = {
      health: 'Run a portfolio health check',
      rebalance: 'Show me rebalancing suggestions',
      tax: 'Help me optimize for taxes',
      growth: 'Find growth opportunities',
    };
    setInputText(actionTexts[actionId] || '');
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          Speech.stop();
          stopTextToSpeech();
          setIsSpeaking(false);
          router.back();
        }} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ask Penny</Text>
        <View style={styles.headerRight}>
          {messages.length > 0 && (
            <Pressable onPress={clearChatHistory} style={styles.clearButton}>
              <Trash2 size={20} color={Colors.textSecondary} />
            </Pressable>
          )}
          <View style={styles.pennyIcon}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.pennyImage}
              resizeMode="contain"
            />
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
              styles.messageWrapper,
              message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper,
            ]}
          >
            {!message.isUser && (
              <View style={styles.aiAvatar}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.aiMessageText,
                ]}
              >
                {message.text}
              </Text>
              {/* Speaker button for AI messages */}
              {!message.isUser && (
                <Pressable
                  style={styles.speakButton}
                  onPress={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speakResponse(message.text);
                    }
                  }}
                >
                  {isSpeaking ? (
                    <VolumeX size={16} color={Colors.danger} />
                  ) : (
                    <Volume2 size={16} color={Colors.purple} />
                  )}
                  <Text style={styles.speakButtonText}>
                    {isSpeaking ? 'Stop' : 'Listen'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.aiAvatar}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.purple} />
              <Text style={styles.loadingText}>Penny is thinking...</Text>
            </View>
          </View>
        )}

        {/* Quick Actions - only show when no messages */}
        {messages.length === 0 && (
          <View style={styles.quickActionsContainer}>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    key={action.id}
                    style={styles.quickActionCard}
                    onPress={() => handleQuickAction(action.id)}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                      <Icon size={24} color={action.color} />
                    </View>
                    <Text style={styles.quickActionTitle}>{action.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        {/* Mic Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={[styles.micButton, isListening && styles.micButtonActive]}
            onPressIn={startListening}
            onPressOut={stopListening}
          >
            <Mic size={20} color={isListening ? Colors.text : Colors.textSecondary} />
          </Pressable>
        </Animated.View>

        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={isListening ? "Listening..." : "Type or hold mic..."}
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
        />

        {/* Speaker Toggle */}
        {isSpeaking ? (
          <Pressable style={styles.speakerButton} onPress={stopSpeaking}>
            <VolumeX size={20} color={Colors.danger} />
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Send size={20} color={inputText.trim() ? Colors.text : Colors.textSecondary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pennyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pennyImage: {
    width: 56,
    height: 56,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 100,
  },
  messageWrapper: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  aiMessageWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    padding: 16,
  },
  userBubble: {
    backgroundColor: Colors.blue,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.purple + '40',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.text,
  },
  aiMessageText: {
    color: Colors.text,
  },
  detailedAnalysisButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.purple,
    alignSelf: 'flex-start',
  },
  detailedAnalysisText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purple,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.purple + '40',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    marginTop: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: Colors.danger,
  },
  speakerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  speakButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.purple,
  },
});
