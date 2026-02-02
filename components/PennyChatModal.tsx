import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { X, Send, Mic, MicOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import { generateWithGemini, GEMINI_SYSTEM_PROMPT } from '@/lib/gemini';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_KEY = 'penny_chat_history';
const MAX_HISTORY = 50;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PennyChatModalProps {
  visible: boolean;
  onClose: () => void;
  financialContext?: {
    healthScore: number;
    healthLabel: string;
    savingsRate: number;
    monthsOfRunway: number;
    monthlyIncome: number;
    monthlyExpenses: number;
  };
}

export function PennyChatModal({ visible, onClose, financialContext }: PennyChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadChatHistory();
    }
  }, [visible]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm Penny, your financial coach. 👋 I'm here to help you build better money habits, answer questions, or just chat about your financial goals. What's on your mind?",
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('[PennyChat] Error loading history:', error);
    }
  };

  const saveChatHistory = async (newMessages: ChatMessage[]) => {
    try {
      const trimmed = newMessages.slice(-MAX_HISTORY);
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[PennyChat] Error saving history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation context
      const recentMessages = newMessages.slice(-10);
      const conversationContext = recentMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Penny'}: ${m.content}`)
        .join('\n');

      const financialContextStr = financialContext
        ? `
User's Financial Snapshot:
- Health Score: ${financialContext.healthScore}/100 (${financialContext.healthLabel})
- Savings Rate: ${financialContext.savingsRate.toFixed(1)}%
- Emergency Runway: ${financialContext.monthsOfRunway.toFixed(1)} months
- Monthly Income: $${financialContext.monthlyIncome.toLocaleString()}
- Monthly Expenses: $${financialContext.monthlyExpenses.toLocaleString()}
`
        : '';

      const prompt = `${GEMINI_SYSTEM_PROMPT}

${financialContextStr}

Recent conversation:
${conversationContext}

Respond to the user's last message naturally and helpfully. Keep responses concise (2-4 sentences unless they ask for more detail). Be warm and supportive.`;

      const response = await generateWithGemini({
        prompt,
        temperature: 0.8,
        maxTokens: 300,
        thinkingLevel: 'low',
      });

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      await saveChatHistory(updatedMessages);
    } catch (error) {
      console.error('[PennyChat] Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment! 💫",
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    // Voice input placeholder - would integrate with speech recognition
    setIsListening(!isListening);
    if (!isListening) {
      // Start listening
      setTimeout(() => {
        setIsListening(false);
        // Simulated voice input
      }, 3000);
    }
  };

  const clearHistory = async () => {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
    await loadChatHistory();
  };

  const QUICK_PROMPTS = [
    "How can I save more?",
    "Check a purchase",
    "Explain my score",
    "Budget tips",
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.headerMascot} />
            <View>
              <Text style={styles.headerTitle}>Chat with Penny</Text>
              <Text style={styles.headerSubtitle}>Your financial coach</Text>
            </View>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
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
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === 'assistant' && (
                <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.messageMascot} />
              )}
              <View
                style={[
                  styles.messageContent,
                  message.role === 'user' ? styles.userContent : styles.assistantContent,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' && styles.userText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.messageMascot} />
              <View style={[styles.messageContent, styles.assistantContent]}>
                <ActivityIndicator size="small" color={Colors.accent} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Prompts */}
        {messages.length <= 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickPromptsContainer}
            contentContainerStyle={styles.quickPromptsContent}
          >
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.quickPrompt}
                onPress={() => {
                  setInputText(prompt);
                }}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <Pressable
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            onPress={toggleVoice}
          >
            {isListening ? (
              <MicOff size={20} color={Colors.textLight} />
            ) : (
              <Mic size={20} color={Colors.accent} />
            )}
          </Pressable>

          <TextInput
            style={styles.textInput}
            placeholder="Ask Penny anything..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />

          <Pressable
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Send size={20} color={inputText.trim() && !isLoading ? Colors.textLight : Colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerMascot: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeButton: {
    padding: 8,
  },

  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  messageMascot: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 14,
  },
  userContent: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  assistantContent: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  userText: {
    color: Colors.textLight,
  },

  quickPromptsContainer: {
    maxHeight: 50,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickPromptsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickPrompt: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  quickPromptText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: Colors.coral,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutralMuted,
  },
});
