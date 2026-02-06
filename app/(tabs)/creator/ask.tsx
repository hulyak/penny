import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Send,
  ThumbsUp,
  MessageCircle,
  Star,
  Clock,
  CheckCircle,
  Play,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getCreatorData,
  submitQuestion,
  upvoteQuestion,
  Question,
  getTimeAgo,
  JOSH_PROFILE,
} from '@/lib/creatorHub';

export default function AskJoshScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'answered' | 'pending' | 'featured'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getCreatorData();
    setQuestions(data.questions);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!newQuestion.trim() || isSubmitting) return;

    if (newQuestion.length < 20) {
      Alert.alert('Too Short', 'Please write a more detailed question (at least 20 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitted = await submitQuestion(newQuestion.trim(), 'You');
      setQuestions((prev) => [submitted, ...prev]);
      setNewQuestion('');
      Alert.alert(
        'Question Submitted!',
        "Your question has been added to the queue. Josh reviews questions weekly and answers the most upvoted ones."
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (questionId: string) => {
    await upvoteQuestion(questionId);
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId && !q.hasUpvoted
          ? { ...q, upvotes: q.upvotes + 1, hasUpvoted: true }
          : q
      )
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'all') return true;
    if (filter === 'featured') return q.status === 'featured';
    if (filter === 'answered') return q.status === 'answered' || q.status === 'featured';
    if (filter === 'pending') return q.status === 'pending';
    return true;
  });

  const answeredCount = questions.filter((q) => q.status === 'answered' || q.status === 'featured').length;
  const pendingCount = questions.filter((q) => q.status === 'pending').length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ask Josh</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <CheckCircle size={18} color={Colors.success} />
          <Text style={styles.statValue}>{answeredCount}</Text>
          <Text style={styles.statLabel}>Answered</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={18} color={Colors.warning} />
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <MessageCircle size={18} color={Colors.accent} />
          <Text style={styles.statValue}>{questions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {(['all', 'featured', 'answered', 'pending'] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                {f === 'featured' && <Star size={12} color={filter === f ? Colors.textLight : Colors.warning} />}
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Questions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {filteredQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            isExpanded={expandedId === question.id}
            onExpand={() => toggleExpand(question.id)}
            onUpvote={() => handleUpvote(question.id)}
          />
        ))}

        {filteredQuestions.length === 0 && (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No questions yet</Text>
            <Text style={styles.emptyText}>Be the first to ask Josh a question!</Text>
          </View>
        )}

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>How it works</Text>
          <View style={styles.howItWorksItem}>
            <View style={styles.howItWorksNumber}>
              <Text style={styles.howItWorksNumberText}>1</Text>
            </View>
            <Text style={styles.howItWorksText}>Ask your investing question below</Text>
          </View>
          <View style={styles.howItWorksItem}>
            <View style={styles.howItWorksNumber}>
              <Text style={styles.howItWorksNumberText}>2</Text>
            </View>
            <Text style={styles.howItWorksText}>Upvote questions you want answered</Text>
          </View>
          <View style={styles.howItWorksItem}>
            <View style={styles.howItWorksNumber}>
              <Text style={styles.howItWorksNumberText}>3</Text>
            </View>
            <Text style={styles.howItWorksText}>Josh answers the top questions weekly</Text>
          </View>
        </View>
      </ScrollView>

      {/* Ask Question Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Josh an investing question..."
          placeholderTextColor={Colors.textMuted}
          value={newQuestion}
          onChangeText={setNewQuestion}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!newQuestion.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!newQuestion.trim() || isSubmitting}
        >
          <Send size={20} color={Colors.textLight} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function QuestionCard({
  question,
  isExpanded,
  onExpand,
  onUpvote,
}: {
  question: Question;
  isExpanded: boolean;
  onExpand: () => void;
  onUpvote: () => void;
}) {
  const hasAnswer = question.status === 'answered' || question.status === 'featured';

  return (
    <View style={[styles.card, question.status === 'featured' && styles.cardFeatured]}>
      {/* Featured Badge */}
      {question.status === 'featured' && (
        <View style={styles.featuredBadge}>
          <Award size={12} color={Colors.warning} />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}

      {/* Question */}
      <View style={styles.questionHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {question.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{question.userName}</Text>
            <Text style={styles.questionTime}>{getTimeAgo(question.askedAt)}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.upvoteButton, question.hasUpvoted && styles.upvoteButtonActive]}
          onPress={onUpvote}
          disabled={question.hasUpvoted}
        >
          <ThumbsUp
            size={16}
            color={question.hasUpvoted ? Colors.accent : Colors.textMuted}
            fill={question.hasUpvoted ? Colors.accent : 'transparent'}
          />
          <Text
            style={[
              styles.upvoteCount,
              question.hasUpvoted && styles.upvoteCountActive,
            ]}
          >
            {question.upvotes}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.questionText}>{question.question}</Text>

      {/* Status Badge */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                hasAnswer ? Colors.successMuted : Colors.warningMuted,
            },
          ]}
        >
          {hasAnswer ? (
            <CheckCircle size={12} color={Colors.success} />
          ) : (
            <Clock size={12} color={Colors.warning} />
          )}
          <Text
            style={[
              styles.statusText,
              { color: hasAnswer ? Colors.success : Colors.warning },
            ]}
          >
            {hasAnswer ? 'Answered' : 'Pending'}
          </Text>
        </View>

        {hasAnswer && (
          <Pressable style={styles.expandButton} onPress={onExpand}>
            <Text style={styles.expandText}>
              {isExpanded ? 'Hide answer' : 'Show answer'}
            </Text>
            {isExpanded ? (
              <ChevronUp size={16} color={Colors.accent} />
            ) : (
              <ChevronDown size={16} color={Colors.accent} />
            )}
          </Pressable>
        )}
      </View>

      {/* Answer (expanded) */}
      {isExpanded && question.answer && (
        <View style={styles.answerSection}>
          <View style={styles.answerHeader}>
            <View style={styles.joshAvatar}>
              <Text style={styles.joshAvatarText}>J</Text>
            </View>
            <View>
              <Text style={styles.joshName}>Josh</Text>
              <Text style={styles.answerTime}>
                {getTimeAgo(question.answer.answeredAt)}
              </Text>
            </View>
            {question.answer.isVideoResponse && (
              <View style={styles.videoBadge}>
                <Play size={12} color={Colors.textLight} fill={Colors.textLight} />
                <Text style={styles.videoText}>Video</Text>
              </View>
            )}
          </View>
          <Text style={styles.answerText}>{question.answer.content}</Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  filtersContainer: {
    paddingBottom: 12,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardFeatured: {
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  questionTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upvoteButtonActive: {
    backgroundColor: Colors.accentMuted,
  },
  upvoteCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  upvoteCountActive: {
    color: Colors.accent,
  },
  questionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  answerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  joshAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joshAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textLight,
  },
  joshName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  answerTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  videoText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  answerText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  howItWorks: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  howItWorksNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howItWorksNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  howItWorksText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
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
    backgroundColor: Colors.surfaceSecondary,
  },
});
