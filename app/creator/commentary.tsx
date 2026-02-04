import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
  Share2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getCreatorData,
  markCommentaryAsRead,
  MarketCommentary,
  getTimeAgo,
  getNotificationSettings,
  updateNotificationSettings,
  CreatorNotificationSettings,
} from '@/lib/creatorHub';

export default function CommentaryScreen() {
  const router = useRouter();
  const [commentary, setCommentary] = useState<MarketCommentary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getCreatorData();
    setCommentary(data.commentary);

    const settings = await getNotificationSettings();
    setNotificationsEnabled(settings.newCommentary);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await markCommentaryAsRead(id);
      // Update local state
      setCommentary((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isRead: true } : c))
      );
    }
  };

  const toggleSaved = (id: string) => {
    setSavedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    const settings = await getNotificationSettings();
    await updateNotificationSettings({ ...settings, newCommentary: newValue });
  };

  const filteredCommentary = filter === 'all'
    ? commentary
    : commentary.filter((c) => c.sentiment === filter);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp size={14} color={Colors.success} />;
      case 'bearish':
        return <TrendingDown size={14} color={Colors.danger} />;
      default:
        return <Minus size={14} color={Colors.textMuted} />;
    }
  };

  const unreadCount = commentary.filter((c) => !c.isRead).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Market Commentary</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.bellButton} onPress={toggleNotifications}>
          {notificationsEnabled ? (
            <Bell size={20} color={Colors.accent} />
          ) : (
            <BellOff size={20} color={Colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {(['all', 'bullish', 'neutral', 'bearish'] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Commentary List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {filteredCommentary.map((item) => (
          <CommentaryCard
            key={item.id}
            item={item}
            isExpanded={expandedId === item.id}
            isSaved={savedIds.has(item.id)}
            onExpand={() => handleExpand(item.id)}
            onToggleSave={() => toggleSaved(item.id)}
            getSentimentIcon={getSentimentIcon}
          />
        ))}

        {filteredCommentary.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No commentary with this filter</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CommentaryCard({
  item,
  isExpanded,
  isSaved,
  onExpand,
  onToggleSave,
  getSentimentIcon,
}: {
  item: MarketCommentary;
  isExpanded: boolean;
  isSaved: boolean;
  onExpand: () => void;
  onToggleSave: () => void;
  getSentimentIcon: (sentiment: string) => React.ReactNode;
}) {
  return (
    <Pressable
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={onExpand}
    >
      {/* Pinned Badge */}
      {item.isPinned && (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>📌 Pinned</Text>
        </View>
      )}

      {/* Unread Indicator */}
      {!item.isRead && <View style={styles.unreadDot} />}

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Summary (shown when collapsed) */}
      {!isExpanded && (
        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      )}

      {/* Full Content (shown when expanded) */}
      {isExpanded && (
        <Text style={styles.cardContent}>{item.content}</Text>
      )}

      {/* Topics */}
      <View style={styles.topicsRow}>
        {item.topics.slice(0, 3).map((topic) => (
          <View key={topic} style={styles.topicChip}>
            <Text style={styles.topicText}>{topic}</Text>
          </View>
        ))}
      </View>

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View
            style={[
              styles.sentimentBadge,
              {
                backgroundColor:
                  item.sentiment === 'bullish'
                    ? Colors.successMuted
                    : item.sentiment === 'bearish'
                    ? Colors.dangerMuted
                    : Colors.surfaceSecondary,
              },
            ]}
          >
            {getSentimentIcon(item.sentiment)}
            <Text
              style={[
                styles.sentimentText,
                {
                  color:
                    item.sentiment === 'bullish'
                      ? Colors.success
                      : item.sentiment === 'bearish'
                      ? Colors.danger
                      : Colors.textSecondary,
                },
              ]}
            >
              {item.sentiment}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <Clock size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{item.readTime} min</Text>
          <View style={styles.metaDivider} />
          <Text style={styles.metaText}>{getTimeAgo(item.publishedAt)}</Text>
        </View>

        <View style={styles.metaRight}>
          <Pressable style={styles.actionButton} onPress={onToggleSave}>
            {isSaved ? (
              <BookmarkCheck size={18} color={Colors.accent} />
            ) : (
              <Bookmark size={18} color={Colors.textMuted} />
            )}
          </Pressable>
          {isExpanded ? (
            <ChevronUp size={18} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={Colors.textMuted} />
          )}
        </View>
      </View>
    </Pressable>
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  unreadBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 16,
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
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  pinnedBadge: {
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    paddingRight: 20,
  },
  cardSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardContent: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  topicChip: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
