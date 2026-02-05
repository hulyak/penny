import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  Calendar,
  Bell,
  BellOff,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Landmark,
  BarChart2,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MarketEvent } from '@/types';

interface Props {
  events: MarketEvent[];
  newsAnalysis?: {
    headlines: { title: string; summary: string; impact: 'positive' | 'neutral' | 'negative'; relevantSymbols: string[] }[];
    marketSentiment: 'bullish' | 'neutral' | 'bearish';
    keyTakeaway: string;
  };
  onToggleAlert?: (eventId: string) => void;
  onViewAll?: () => void;
}

export function MarketEventsCard({ events, newsAnalysis, onToggleAlert, onViewAll }: Props) {
  const [activeAlerts, setActiveAlerts] = useState<Set<string>>(new Set());

  const toggleAlert = (eventId: string) => {
    setActiveAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
    onToggleAlert?.(eventId);
  };

  const getEventIcon = (type: MarketEvent['type']) => {
    switch (type) {
      case 'earnings':
        return <DollarSign size={16} color={Colors.success} />;
      case 'fed_decision':
        return <Landmark size={16} color={Colors.blue} />;
      case 'economic_data':
        return <BarChart2 size={16} color={Colors.purple} />;
      case 'dividend':
        return <DollarSign size={16} color={Colors.gold} />;
      default:
        return <Calendar size={16} color={Colors.textSecondary} />;
    }
  };

  const getImpactColor = (impact: MarketEvent['impact']) => {
    switch (impact) {
      case 'high':
        return Colors.danger;
      case 'medium':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  const getSentimentIcon = (sentiment: 'bullish' | 'neutral' | 'bearish') => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp size={18} color={Colors.success} />;
      case 'bearish':
        return <TrendingDown size={18} color={Colors.danger} />;
      default:
        return <Minus size={18} color={Colors.textSecondary} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const daysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <Calendar size={20} color={Colors.warning} />
          </View>
          <View>
            <Text style={styles.title}>Market Events & News</Text>
            <Text style={styles.subtitle}>{events.length} upcoming events</Text>
          </View>
        </View>
        {onViewAll && (
          <Pressable onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color={Colors.accent} />
          </Pressable>
        )}
      </View>

      {/* Market Sentiment */}
      {newsAnalysis && (
        <View style={styles.sentimentCard}>
          {getSentimentIcon(newsAnalysis.marketSentiment)}
          <View style={styles.sentimentContent}>
            <Text style={styles.sentimentLabel}>Market Sentiment</Text>
            <Text style={styles.sentimentValue}>
              {newsAnalysis.marketSentiment.charAt(0).toUpperCase() + newsAnalysis.marketSentiment.slice(1)}
            </Text>
          </View>
        </View>
      )}

      {/* Key Takeaway */}
      {newsAnalysis?.keyTakeaway && (
        <View style={styles.takeawayCard}>
          <Info size={16} color={Colors.accent} />
          <Text style={styles.takeawayText}>{newsAnalysis.keyTakeaway}</Text>
        </View>
      )}

      {/* Headlines */}
      {newsAnalysis?.headlines && newsAnalysis.headlines.length > 0 && (
        <View style={styles.headlinesSection}>
          <Text style={styles.sectionTitle}>Latest Analysis</Text>
          {newsAnalysis.headlines.slice(0, 2).map((headline, index) => (
            <View key={index} style={styles.headlineItem}>
              <View style={styles.headlineHeader}>
                <View style={[
                  styles.impactDot,
                  { backgroundColor: headline.impact === 'positive' ? Colors.success :
                      headline.impact === 'negative' ? Colors.danger : Colors.textSecondary }
                ]} />
                <Text style={styles.headlineTitle}>{headline.title}</Text>
              </View>
              <Text style={styles.headlineSummary}>{headline.summary}</Text>
              {headline.relevantSymbols.length > 0 && (
                <View style={styles.symbolsRow}>
                  {headline.relevantSymbols.slice(0, 3).map((symbol) => (
                    <View key={symbol} style={styles.symbolBadge}>
                      <Text style={styles.symbolText}>{symbol}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming events for your holdings</Text>
        ) : (
          events.slice(0, 4).map((event) => {
            const days = daysUntil(event.date);
            const isAlertActive = activeAlerts.has(event.id);

            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={[styles.eventIcon, { backgroundColor: getImpactColor(event.impact) + '20' }]}>
                  {getEventIcon(event.type)}
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                    {event.time && <Text style={styles.eventTime}> · {event.time}</Text>}
                    {days <= 2 && days >= 0 && (
                      <View style={[styles.urgentBadge, days === 0 && styles.todayBadge]}>
                        <Text style={styles.urgentText}>
                          {days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days}d`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable
                  style={[styles.alertButton, isAlertActive && styles.alertButtonActive]}
                  onPress={() => toggleAlert(event.id)}
                >
                  {isAlertActive ? (
                    <Bell size={18} color={Colors.accent} />
                  ) : (
                    <BellOff size={18} color={Colors.textMuted} />
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      {/* Impact Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
          <Text style={styles.legendText}>High Impact</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.textSecondary }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.warningMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },
  sentimentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  sentimentContent: {
    flex: 1,
  },
  sentimentLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  takeawayCard: {
    flexDirection: 'row',
    backgroundColor: Colors.accentMuted,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  takeawayText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  headlinesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headlineItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  headlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  impactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headlineTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  headlineSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  symbolsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  symbolBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  symbolText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  eventsSection: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  urgentBadge: {
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  todayBadge: {
    backgroundColor: Colors.dangerMuted,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },
  alertButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertButtonActive: {
    backgroundColor: Colors.accentMuted,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
