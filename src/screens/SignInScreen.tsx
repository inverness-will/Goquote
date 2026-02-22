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

export interface SignInScreenProps {
  onSignUp?: () => void;
  onForgotPassword?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignUp, onForgotPassword }) => {
  const { width } = useWindowDimensions();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [emailFocused, setEmailFocused] = React.useState(false);
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const RIGHT_PANEL_MIN_WIDTH = 1120;
  const showRightPanel = width >= RIGHT_PANEL_MIN_WIDTH;

  const onContinue = () => {
    // TODO: Wire this up to your backend API
    console.log('Sign in with', { email, password, agreeTerms });
  };

  const handleSignUp = () => {
    onSignUp?.();
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
            {/* Header: logo + title (GoQuote black, Estimator orange per Figma) */}
            <View style={styles.header}>
              <View style={styles.logoSquare} />
              <Text style={styles.brandGoQuote}>GoQuote</Text>
              <Text style={styles.brandEstimator}> Estimator</Text>
            </View>

            {/* Main content */}
            <View style={styles.content}>
              {/* Welcome section */}
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Welcome to GoQuote Estimator</Text>
                <Text style={styles.welcomeSubtitle}>
                  Smart cost estimation for operations teams.
                </Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
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

                <View style={styles.field}>
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

                {/* Terms row + Forgot password */}
                <View style={styles.termsRow}>
                  <View style={styles.termsLeft}>
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
                  <TouchableOpacity onPress={onForgotPassword}>
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Continue button */}
                <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                  <TouchableOpacity onPress={handleSignUp}>
                    <Text style={styles.signUpLink}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Right decorative panel (desktop only) - illustration from Figma node 42-3486 */}
          {showRightPanel && (
            <View style={styles.rightPanel} pointerEvents="none">
              <View style={styles.blur1} />
              <View style={styles.blur2} />
              <View style={styles.illustration}>
                {/* Excel icon + dashed connector + app card */}
                <View style={styles.illustrationContent}>
                  {/* Excel icon (green square with X) */}
                  <View style={styles.excelIcon}>
                    <Text style={styles.excelX}>X</Text>
                  </View>
                  {/* Dashed connector dot */}
                  <View style={styles.connectorDot} />
                  {/* Dashed line - simulated with border */}
                  <View style={styles.dashedConnector} />
                  {/* App window card */}
                  <View style={styles.appCard}>
                    <View style={styles.windowControls}>
                      <View style={[styles.windowDot, styles.windowDotRed]} />
                      <View style={[styles.windowDot, styles.windowDotYellow]} />
                      <View style={[styles.windowDot, styles.windowDotGreen]} />
                    </View>
                    <View style={styles.appCardBody}>
                      {/* 2x2 grid of dashboard modules */}
                      <View style={styles.modulesGrid}>
                        <View style={styles.moduleCard}>
                          <Feather name="bar-chart-2" size={24} color="#1BC685" />
                          <View style={styles.moduleLines}>
                            <View style={styles.moduleLine} />
                            <View style={styles.moduleLine} />
                          </View>
                        </View>
                        <View style={styles.moduleCard}>
                          <Feather name="calendar" size={24} color="#F67A34" />
                          <View style={styles.moduleLines}>
                            <View style={styles.moduleLine} />
                            <View style={styles.moduleLine} />
                          </View>
                        </View>
                        <View style={styles.moduleCard}>
                          <Feather name="users" size={24} color="#40BFED" />
                          <View style={styles.moduleLines}>
                            <View style={styles.moduleLine} />
                            <View style={styles.moduleLine} />
                          </View>
                        </View>
                        <View style={styles.moduleCard}>
                          <Feather name="dollar-sign" size={24} color="#B9ADFF" />
                          <View style={styles.moduleLines}>
                            <View style={styles.moduleLine} />
                            <View style={styles.moduleLine} />
                          </View>
                        </View>
                      </View>
                      <View style={styles.estimatorBranding}>
                        <Feather name="file-text" size={16} color="#1D2131" />
                        <Text style={styles.estimatorTitle}>Estimator</Text>
                      </View>
                      <Text style={styles.estimatorTagline}>
                        No more spreadsheets. Just smart estimating.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
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
  content: {
    gap: 48
  },
  welcomeSection: {
    gap: 12,
    marginBottom: 8
  },
  welcomeTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 45,
    color: '#1D2131'
  },
  welcomeSubtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 28,
    color: '#484566'
  },
  form: {
    gap: 20
  },
  field: {
    gap: 6
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
  inputIconLeft: {
    marginRight: 0
  },
  eyeIcon: {
    padding: 4
  },
  inputFocused: {
    backgroundColor: '#FFFBFB',
    borderColor: '#F67A34'
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4
  },
  termsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
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
  forgotLink: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#F67A34'
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#F67A34',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
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
  signUpLink: {
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
    backgroundColor: '#FFFBF8',
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  illustrationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0
  },
  excelIcon: {
    width: 86,
    height: 80,
    backgroundColor: '#21A366',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  excelX: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700'
  },
  connectorDot: {
    width: 12,
    height: 12,
    backgroundColor: '#33C481',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 9999,
    marginLeft: 12,
    marginRight: -6
  },
  dashedConnector: {
    width: 84,
    height: 2,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(71, 85, 105, 0.5)',
    marginRight: 16
  },
  appCard: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    shadowColor: '#F67A34',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden'
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: 'rgba(248, 250, 252, 0.8)'
  },
  windowDot: {
    width: 12,
    height: 12,
    borderRadius: 9999
  },
  windowDotRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)'
  },
  windowDotYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.5)'
  },
  windowDotGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)'
  },
  appCardBody: {
    padding: 24,
    gap: 24
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  moduleCard: {
    width: '47%',
    minWidth: 150,
    backgroundColor: '#1D2131',
    borderRadius: 15,
    padding: 17,
    gap: 10
  },
  moduleLines: {
    gap: 6
  },
  moduleLine: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    width: '70%'
  },
  estimatorBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  estimatorTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 30,
    color: '#1D2131'
  },
  estimatorTagline: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 27,
    color: '#484566'
  }
});
