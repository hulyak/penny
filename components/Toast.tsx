import React, { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Check, AlertTriangle, Info, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Spacing, FontSize, BorderRadius } from '@/constants/design';
import haptics from '@/lib/haptics';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((config: ToastConfig) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast(config);

    // Haptic feedback based on toast type
    switch (config.type) {
      case 'success':
        haptics.success();
        break;
      case 'error':
        haptics.error();
        break;
      case 'warning':
        haptics.warning();
        break;
      default:
        haptics.lightTap();
    }

    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const duration = config.duration || 3000;
    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    }, duration);
  }, [translateY, opacity]);

  const getToastStyle = (type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        return { bg: Colors.success, icon: Check };
      case 'error':
        return { bg: Colors.danger, icon: X };
      case 'warning':
        return { bg: Colors.warning, icon: AlertTriangle };
      default:
        return { bg: Colors.primary, icon: Info };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY }],
              opacity,
              backgroundColor: getToastStyle(toast.type).bg,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.toastContent}>
            {React.createElement(getToastStyle(toast.type).icon, {
              size: 20,
              color: '#FFFFFF',
            })}
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toastText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
