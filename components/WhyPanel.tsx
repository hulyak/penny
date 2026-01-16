import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, HelpCircle, Lightbulb, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface WhyPanelProps {
  title?: string;
  summary: string;
  reasoning: string;
  assumptions?: string[];
  whatWouldChange?: string[];
  confidence?: number;
}

export function WhyPanel({ 
  title = 'Why?',
  summary, 
  reasoning, 
  assumptions = [], 
  whatWouldChange = [],
  confidence,
}: WhyPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <HelpCircle size={16} color={Colors.accent} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={Colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={Colors.textMuted} />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text}>{summary}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reasoning</Text>
            <Text style={styles.text}>{reasoning}</Text>
          </View>

          {assumptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Lightbulb size={14} color={Colors.warning} />
                <Text style={styles.sectionTitle}>Assumptions</Text>
              </View>
              {assumptions.map((assumption, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{assumption}</Text>
                </View>
              ))}
            </View>
          )}

          {whatWouldChange.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertCircle size={14} color={Colors.accent} />
                <Text style={styles.sectionTitle}>What Would Change This</Text>
              </View>
              {whatWouldChange.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.bullet, { backgroundColor: Colors.accent }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {confidence !== undefined && (
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence Level</Text>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${confidence * 100}%` }]} />
              </View>
              <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: 8,
  },
  content: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  text: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 6,
    marginRight: 10,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  confidenceContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
    textAlign: 'right',
  },
});
