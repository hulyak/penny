import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { 
  DollarSign,
  Home,
  Car,
  ShoppingCart,
  PiggyBank,
  CreditCard,
  RefreshCw,
  Save,
  Edit3,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.com/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

export default function ProfileScreen() {
  const { financials, updateFinancials, resetDemo } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFinancials, setEditedFinancials] = useState({ ...financials });

  const handleSave = () => {
    updateFinancials(editedFinancials);
    setIsEditing(false);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Demo',
      'This will reset all your data to demo values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetDemo();
            setIsEditing(false);
          },
        },
      ]
    );
  };

  const updateField = (field: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    setEditedFinancials(prev => ({ ...prev, [field]: numValue }));
  };

  const renderField = (
    label: string,
    field: string,
    icon: React.ReactNode
  ) => {
    const value = isEditing 
      ? editedFinancials[field as keyof typeof editedFinancials]
      : financials[field as keyof typeof financials];

    return (
      <View style={styles.fieldRow}>
        <View style={styles.fieldLeft}>
          {icon}
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={(text) => updateField(field, text)}
            keyboardType="numeric"
            placeholder="0"
          />
        ) : (
          <Text style={styles.fieldValue}>
            ${(value as number).toLocaleString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Mascot Header */}
      <View style={styles.mascotCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.mascotImage} />
        <View style={styles.mascotContent}>
          <Text style={styles.mascotTitle}>Your Profile</Text>
          <Text style={styles.mascotMessage}>
            {isEditing ? "Make your updates - I'll recalculate!" : "Update anytime, I'll adjust your plan!"}
          </Text>
        </View>
      </View>

      {/* Income & Expenses Card */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Income & Expenses</Text>
          {!isEditing ? (
            <Pressable 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Edit3 size={16} color={Colors.accent} />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : (
            <Pressable 
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Save size={16} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          )}
        </View>

        {renderField('Monthly Income', 'monthlyIncome', 
          <DollarSign size={18} color={Colors.success} />
        )}
        {renderField('Housing', 'housingCost', 
          <Home size={18} color={Colors.accent} />
        )}
        {renderField('Transportation', 'carCost', 
          <Car size={18} color={Colors.warning} />
        )}
        {renderField('Essentials', 'essentialsCost', 
          <ShoppingCart size={18} color={Colors.textSecondary} />
        )}
      </Card>

      {/* Savings & Goals Card */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Savings & Goals</Text>
        
        {renderField('Current Savings', 'savings', 
          <PiggyBank size={18} color={Colors.success} />
        )}
        {renderField('Total Debt', 'debts', 
          <CreditCard size={18} color={Colors.danger} />
        )}
        {renderField('Emergency Goal', 'emergencyFundGoal', 
          <DollarSign size={18} color={Colors.accent} />
        )}
      </Card>

      {/* Reset Button */}
      <Pressable style={styles.resetButton} onPress={handleReset}>
        <RefreshCw size={18} color={Colors.danger} />
        <Text style={styles.resetText}>Reset to Demo Data</Text>
      </Pressable>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.tipMascot} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Your Data is Private</Text>
          <Text style={styles.tipText}>
            Everything stays on your device. This is an educational tool, not financial advice.
          </Text>
        </View>
      </View>
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
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mascotImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  mascotContent: {
    flex: 1,
    marginLeft: 12,
  },
  mascotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  mascotMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.accent + '15',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.success,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 15,
    color: Colors.text,
    marginLeft: 12,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    textAlign: 'right',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    marginBottom: 16,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    padding: 16,
    borderRadius: 12,
  },
  tipMascot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
