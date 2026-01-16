import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { 
  User,
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
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User size={32} color={Colors.accent} />
        </View>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.subtitle}>
          Update your numbers anytime. Agents will recalculate automatically.
        </Text>
      </View>

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
          <ShoppingCart size={18} color={Colors.agents.scenarioLearning} />
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Savings & Debt</Text>
        
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

      <Pressable style={styles.resetButton} onPress={handleReset}>
        <RefreshCw size={18} color={Colors.danger} />
        <Text style={styles.resetText}>Reset to Demo Data</Text>
      </Pressable>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Your data stays on your device. ClearPath is an educational tool 
          and does not provide financial advice.
        </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    padding: 16,
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
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.success,
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
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
    borderRadius: 6,
    minWidth: 100,
    textAlign: 'right',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.danger + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    marginTop: 8,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 8,
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
