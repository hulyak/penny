import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Send,
  TrendingUp,
  Target,
  DollarSign,
  Rocket,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import EnhancedCard from '@/components/ui/EnhancedCard';
import haptics from '@/lib/haptics';
import { generateWithGemini } from '@/lib/gemini';
import { useAuth } from '@/context/AuthContext';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { ActivityIndicator } from 'react-native';

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
${holdings.map(h => `- ${h.name} (${h.symbol}): ${h.shares} shares, Current Value: $${(h.currentPrice * h.shares).toFixed(2)}, Gain: ${((h.currentPrice - h.purchasePrice) / h.purchasePrice * 100).toFixed(2)}%`).join('\n')}
`;

        const systemPrompt = `You are Penny, a friendly and knowledgeable AI financial advisor for ClearPath, a personal finance app. You help users make informed investment decisions.

Your personality:
- Supportive and encouraging
- Clear and concise
- Educational but not condescending
- Use bullet points for clarity
- Always consider the user's current portfolio

When giving advice:
- Consider their current holdings and diversification
- Explain reasoning simply
- Mention risks when relevant
- Suggest specific actions when appropriate

${portfolioContext}`;

        const aiResponseText = await generateWithGemini({
          prompt: userQuestion,
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxTokens: 500,
          thinkingLevel: 'medium',
          feature: 'ask_penny_chat',
        });

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText,
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error('AI response error:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble connecting right now. Please try again in a moment!",
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.pennyIcon}>
          <Image
            source={require('@/assets/images/bird-penny.png')}
            style={styles.pennyImage}
            resizeMode="contain"
          />
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
                  source={require('@/assets/images/bird-penny.png')}
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

            </View>
          </View>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.aiAvatar}>
              <Image
                source={require('@/assets/images/bird-penny.png')}
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

        {/* Quick Actions */}
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
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your question..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
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
});
