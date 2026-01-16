import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
} from 'react-native';
import { 
  CheckCircle2, 
  Circle, 
  Target,
  Wallet,
  BookOpen,
  PiggyBank,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { WhyPanel } from '@/components/WhyPanel';
import Colors from '@/constants/colors';

const CATEGORY_ICONS = {
  save: PiggyBank,
  reduce: Wallet,
  learn: BookOpen,
  buffer: Target,
};

const PRIORITY_COLORS = {
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.accent,
};

export default function PlanScreen() {
  const { weeklyFocuses, updateFocusProgress, adaptationOutput } = useApp();

  const completedCount = weeklyFocuses.filter(f => f.progress === 100).length;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Plan</Text>
        <Text style={styles.subtitle}>
          {completedCount} of {weeklyFocuses.length} tasks complete
        </Text>
      </View>

      <View style={styles.progressSummary}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(completedCount / weeklyFocuses.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {weeklyFocuses.map((focus) => {
        const Icon = CATEGORY_ICONS[focus.category] || Target;
        const isComplete = focus.progress === 100;
        
        return (
          <Card key={focus.id} style={styles.taskCard}>
            <Pressable 
              style={styles.taskHeader}
              onPress={() => updateFocusProgress(focus.id, isComplete ? 0 : 100)}
            >
              {isComplete ? (
                <CheckCircle2 size={24} color={Colors.success} />
              ) : (
                <Circle size={24} color={Colors.border} />
              )}
              
              <View style={styles.taskContent}>
                <View style={styles.taskTitleRow}>
                  <Text style={[
                    styles.taskTitle,
                    isComplete && styles.taskTitleComplete
                  ]}>
                    {focus.title}
                  </Text>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: PRIORITY_COLORS[focus.priority] + '15' }
                  ]}>
                    <Text style={[
                      styles.priorityText,
                      { color: PRIORITY_COLORS[focus.priority] }
                    ]}>
                      {focus.priority}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.taskDescription}>{focus.description}</Text>
                
                <View style={styles.categoryBadge}>
                  <Icon size={14} color={Colors.textMuted} />
                  <Text style={styles.categoryText}>{focus.category}</Text>
                </View>
              </View>
            </Pressable>

            {focus.agentReasoning && (
              <View style={styles.reasoningContainer}>
                <Text style={styles.reasoningLabel}>Why this task?</Text>
                <Text style={styles.reasoningText}>{focus.agentReasoning}</Text>
              </View>
            )}
          </Card>
        );
      })}

      {adaptationOutput && (
        <View style={styles.whyContainer}>
          <WhyPanel
            title="About Your Plan"
            summary={adaptationOutput.summary}
            reasoning={adaptationOutput.reasoning}
            assumptions={adaptationOutput.assumptions}
            whatWouldChange={adaptationOutput.whatWouldChange}
            confidence={adaptationOutput.confidence}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  progressSummary: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  taskCard: {
    marginBottom: 12,
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskContent: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  taskTitleComplete: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  reasoningContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  whyContainer: {
    marginTop: 16,
  },
});
