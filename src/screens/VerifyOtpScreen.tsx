import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthDecorativePanel } from '../components/AuthDecorativePanel';

export interface VerifyOtpScreenProps {
  onBack?: () => void;
  onContinue?: (code: string) => void;
  onResend?: () => void;
}

export const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({ onBack, onContinue, onResend }) => {
  const { width } = useWindowDimensions();
  const RIGHT_PANEL_MIN_WIDTH = 1120;
  const showRightPanel = width >= RIGHT_PANEL_MIN_WIDTH;
  const [digits, setDigits] = React.useState<string[]>(['', '', '', '', '', '']);
  const inputsRef = React.useRef<Array<TextInput | null>>([]);
  const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined;

  const setDigitAt = (index: number, value: string) => {
    const nextChar = value.replace(/[^0-9]/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextChar;
    setDigits(nextDigits);

    if (nextChar && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <View style={styles.leftColumn}>
            <View style={styles.header}>
              <View style={styles.logoSquare} />
              <Text style={styles.brandGoQuote}>GoQuote</Text>
              <Text style={styles.brandEstimator}> Estimator</Text>
            </View>

            <View style={styles.content}>
              <TouchableOpacity style={styles.backRow} onPress={onBack}>
                <Feather name="chevron-left" size={20} color="#F67A34" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <View style={styles.titleBlock}>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the one-time code we sent to your email to reset your password.
                </Text>
              </View>

              <View style={styles.otpRow}>
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(input) => {
                      inputsRef.current[index] = input;
                    }}
                    style={[styles.otpInput, index === 0 && styles.otpInputActive, webNoOutline]}
                    value={digit}
                    onChangeText={(value) => setDigitAt(index, value)}
                    onKeyPress={({ nativeEvent }) => onKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => onContinue?.(digits.join(''))}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Still having trouble?</Text>
                <TouchableOpacity onPress={onResend}>
                  <Text style={styles.footerLink}>Resend Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showRightPanel && (
            <AuthDecorativePanel
              variant="otp"
              title="One-Time Password"
              subtitle="Enter OTP to reset your password."
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    minHeight: '100%'
  },
  leftColumn: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 500,
    alignSelf: 'center',
    justifyContent: 'space-between',
    minHeight: 700
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logoSquare: {
    width: 12,
    height: 12,
    backgroundColor: '#1D2131',
    borderRadius: 4
  },
  brandGoQuote: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: '#1D2131'
  },
  brandEstimator: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '300',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: '#F67A34'
  },
  content: {
    gap: 30
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  backText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 28,
    color: '#F67A34'
  },
  titleBlock: {
    gap: 12
  },
  title: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 45,
    letterSpacing: -0.9,
    color: '#1D2131'
  },
  subtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 28,
    color: '#484566'
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12
  },
  otpInput: {
    width: 58,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 15,
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
    color: '#6B7280',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center'
  },
  otpInputActive: {
    borderColor: '#F67A34',
    backgroundColor: '#FFFBFB',
    color: '#484566'
  },
  footer: {
    gap: 12,
    alignItems: 'center'
  },
  primaryButton: {
    width: '100%',
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F67A34',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F67A34',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  primaryButtonText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF'
  },
  footerRow: {
    flexDirection: 'row',
    gap: 2
  },
  footerText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#484566'
  },
  footerLink: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#F67A34'
  }
});
