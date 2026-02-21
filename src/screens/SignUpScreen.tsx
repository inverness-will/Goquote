import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface SignUpScreenProps {
  onSignIn?: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSignIn }) => {
  const { width } = useWindowDimensions();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [emailFocused, setEmailFocused] = React.useState(false);
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = React.useState(false);
  const RIGHT_PANEL_MIN_WIDTH = 1120;
  const showRightPanel = width >= RIGHT_PANEL_MIN_WIDTH;

  const onContinue = () => {
    // TODO: Wire this up to your backend API
    console.log('Sign up with', { fullName, email, password, confirmPassword, agreeTerms });
  };

  const onTermsPress = () => {
    // TODO: Navigate to terms & privacy
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          {/* Left content column */}
          <View style={styles.leftColumn}>
            {/* Header: logo + title */}
            <View style={styles.header}>
              <View style={styles.logoSquare} />
              <Text style={styles.brandGoQuote}>GoQuote</Text>
              <Text style={styles.brandEstimator}> Estimator</Text>
            </View>

            {/* Main content */}
            <View style={styles.content}>
              {/* Title section */}
              <View style={styles.titleSection}>
                <Text style={styles.title}>Create your account</Text>
                <Text style={styles.subtitle}>
                  Start building precise project estimates today.
                </Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={16} color="#484566" style={styles.inputIconLeft} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="John Doe"
                      placeholderTextColor="#484566"
                      autoCapitalize="words"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
                    <Feather name="mail" size={16} color="#484566" style={styles.inputIconLeft} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Johndoe@email.com"
                      placeholderTextColor="#484566"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>
                </View>

                {/* Password + Confirm Password - two columns on wide, stack on narrow */}
                <View style={[styles.passwordRow, width < 600 && styles.passwordRowStack]}>
                  <View style={[styles.field, styles.passwordField]}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="lock" size={16} color="#94A3B8" style={styles.inputIconLeft} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="••••••••••••"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!passwordVisible}
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setPasswordVisible(!passwordVisible)}
                        style={styles.eyeIcon}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather
                          name={passwordVisible ? 'eye-off' : 'eye'}
                          size={16}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.field, styles.passwordField]}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="lock" size={16} color="#94A3B8" style={styles.inputIconLeft} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="••••••••••••"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!confirmPasswordVisible}
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        style={styles.eyeIcon}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather
                          name={confirmPasswordVisible ? 'eye-off' : 'eye'}
                          size={16}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Terms checkbox */}
                <View style={styles.termsRow}>
                  <TouchableOpacity
                    onPress={() => setAgreeTerms(!agreeTerms)}
                    style={styles.checkbox}
                    hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
                  >
                    <View style={[styles.checkboxBox, agreeTerms && styles.checkboxChecked]}>
                      {agreeTerms && <View style={styles.checkmark} />}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.termsTextRow}>
                    <Text style={styles.termsText}>I agree to the </Text>
                    <TouchableOpacity onPress={onTermsPress}>
                      <Text style={styles.termsLink}>Terms & Privacy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Continue button */}
                <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity onPress={onSignIn}>
                    <Text style={styles.signInLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Right decorative panel (desktop only) - Profile-Setup illustration */}
          {showRightPanel && (
            <View style={styles.rightPanel} pointerEvents="none">
              <View style={styles.rightPanelGradient} />
              <View style={styles.blur1} />
              <View style={styles.blur2} />
              <View style={styles.illustration}>
                {/* Profile-Setup graphic: two dark bars */}
                <View style={styles.profileSetupCard}>
                  <View style={styles.profileBarTop}>
                    <Feather name="user" size={24} color="#484566" />
                    <View style={styles.profileBarLine} />
                    <Feather name="zap" size={24} color="#F67A34" />
                  </View>
                  <View style={styles.profileBarBottom}>
                    <View style={styles.profileBarLeft}>
                      <Feather name="settings" size={24} color="#484566" />
                      <View style={styles.profileBarLines}>
                        <View style={styles.profileLineShort} />
                        <View style={styles.profileLineShort} />
                        <View style={styles.profileLineShort} />
                      </View>
                    </View>
                    <View style={styles.profileBarRight}>
                      <View style={styles.profileLineGroup}>
                        <View style={styles.profileLineShort} />
                        <View style={styles.profileLineShort} />
                        <View style={styles.profileLineShort} />
                      </View>
                      <View style={styles.profileGreenDot} />
                    </View>
                  </View>
                </View>
                <View style={styles.profileSetupBranding}>
                  <Feather name="user" size={24} color="#1D2131" />
                  <Text style={styles.profileSetupTitle}>Profile-Setup</Text>
                </View>
                <Text style={styles.profileSetupTagline}>
                  Start smart, personalize your estimator.
                </Text>
              </View>
            </View>
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
    alignSelf: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 48
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
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: '#F67A34'
  },
  content: { gap: 32 },
  titleSection: {
    gap: 8,
    marginBottom: 8
  },
  title: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 45,
    color: '#1D2131'
  },
  subtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 28,
    color: '#484566'
  },
  form: { gap: 20 },
  field: { gap: 6 },
  passwordRow: {
    flexDirection: 'row',
    gap: 16
  },
  passwordRowStack: {
    flexDirection: 'column'
  },
  passwordField: {
    flex: 1,
    minWidth: 0
  },
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 15,
    paddingHorizontal: 15
  },
  inputWithIcon: {
    flex: 1,
    marginLeft: 15,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131'
  },
  inputIconLeft: { marginRight: 0 },
  eyeIcon: { padding: 4 },
  inputFocused: {
    backgroundColor: '#FFFBFB',
    borderColor: '#F67A34'
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: { alignItems: 'center', justifyContent: 'center' },
  checkboxBox: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#484566',
    borderRadius: 2.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#F67A34',
    borderColor: '#F67A34'
  },
  checkmark: {
    width: 5,
    height: 9,
    marginTop: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }]
  },
  termsTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginLeft: 8
  },
  termsText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#484566'
  },
  termsLink: {
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#F67A34',
    textDecorationLine: 'underline'
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#F67A34',
    borderRadius: 15,
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
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF'
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  footerText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#484566'
  },
  signInLink: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#F67A34'
  },
  rightPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: '50%',
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
    overflow: 'hidden'
  },
  rightPanelGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFBF8'
  },
  blur1: {
    position: 'absolute',
    left: '47.5%',
    right: '-10%',
    top: '-20%',
    bottom: '70%',
    backgroundColor: 'rgba(246, 122, 52, 0.05)',
    borderRadius: 9999
  },
  blur2: {
    position: 'absolute',
    left: '-10%',
    right: '57.92%',
    top: '68.33%',
    bottom: '-10%',
    backgroundColor: 'rgba(246, 122, 52, 0.05)',
    borderRadius: 9999
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48
  },
  profileSetupCard: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    padding: 24,
    gap: 16,
    shadowColor: '#F67A34',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6
  },
  profileBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2131',
    borderRadius: 12,
    padding: 16,
    gap: 16
  },
  profileBarLine: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    opacity: 0.5
  },
  profileBarBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2131',
    borderRadius: 12,
    padding: 16,
    gap: 16
  },
  profileBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  profileBarLines: { gap: 6 },
  profileBarRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12
  },
  profileLineGroup: { gap: 6 },
  profileLineShort: {
    width: 40,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    opacity: 0.5
  },
  profileGreenDot: {
    width: 12,
    height: 12,
    backgroundColor: '#33C481',
    borderRadius: 9999
  },
  profileSetupBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24
  },
  profileSetupTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 30,
    color: '#1D2131'
  },
  profileSetupTagline: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 27,
    color: '#484566',
    marginTop: 8
  }
});
