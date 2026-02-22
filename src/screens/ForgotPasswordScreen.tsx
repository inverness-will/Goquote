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

export interface ForgotPasswordScreenProps {
  onBack?: () => void;
  onContinue?: (email: string) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack, onContinue }) => {
  const { width } = useWindowDimensions();
  const [email, setEmail] = React.useState('');
  const RIGHT_PANEL_MIN_WIDTH = 1120;
  const showRightPanel = width >= RIGHT_PANEL_MIN_WIDTH;
  const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined;

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
                <Text style={styles.title}>Enter your email</Text>
                <Text style={styles.subtitle}>
                  Enter the email address associated with your account and we&apos;ll send you a recovery link.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={16} color="#6B7280" />
                  <TextInput
                    style={[styles.input, webNoOutline]}
                    placeholder="Johndoe@email.com"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => onContinue?.(email)}>
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showRightPanel && (
            <AuthDecorativePanel
              variant="email"
              title="Email"
              subtitle="Get real-time alerts for the updates that matter to you."
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
  field: { gap: 6 },
  label: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 15,
    paddingHorizontal: 15
  },
  input: {
    flex: 1,
    marginLeft: 15,
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131',
    paddingVertical: 0
  },
  footer: {
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
  }
});
