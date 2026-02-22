import React, { useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { SignInScreen } from './src/screens/SignInScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { VerifyOtpScreen } from './src/screens/VerifyOtpScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import {
  forgotPassword,
  resetPassword,
  signIn,
  signUp,
  verifyOtp
} from './src/services/authApi';

type Screen = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify-otp' | 'reset-password';
type OtpFlow = 'signup' | 'password-reset';

export default function App() {
  const [screen, setScreen] = useState<Screen>('sign-in');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [otpFlow, setOtpFlow] = useState<OtpFlow>('password-reset');

  const showPopup = (title: string, message: string) => {
    if (typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {screen === 'sign-in' && (
        <SignInScreen
          onSignUp={() => setScreen('sign-up')}
          onForgotPassword={() => setScreen('forgot-password')}
          onSignIn={async (email, password) => {
            try {
              await signIn({ email, password });
              showPopup('Signed in', 'Sign-in succeeded.');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Sign-in failed.';
              showPopup('Sign-in failed', message);
            }
          }}
        />
      )}
      {screen === 'sign-up' && (
        <SignUpScreen
          onSignIn={() => setScreen('sign-in')}
          onSignUpSubmit={async ({ fullName, email, password, confirmPassword, agreeTerms }) => {
            if (!fullName.trim()) {
              showPopup('Missing name', 'Please enter your full name.');
              return;
            }
            if (!email.trim()) {
              showPopup('Missing email', 'Please enter your email address.');
              return;
            }
            if (!email.includes('@')) {
              showPopup('Invalid email', 'Please enter a valid email address.');
              return;
            }
            if (password.length < 8) {
              showPopup('Password too short', 'Password must be at least 8 characters.');
              return;
            }
            if (!agreeTerms) {
              showPopup('Terms required', 'Please agree to the terms and privacy policy.');
              return;
            }
            if (password !== confirmPassword) {
              showPopup('Password mismatch', 'Password and confirm password must match.');
              return;
            }
            try {
              const result = await signUp({ fullName, email, password });
              setRecoveryEmail(email);
              setRecoveryCode('');
              setOtpFlow('signup');
              setScreen('verify-otp');
              if (result.debugOtpCode) {
                showPopup('OTP generated (dev)', `Use code: ${result.debugOtpCode}`);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Sign-up failed.';
              showPopup('Sign-up failed', message);
            }
          }}
        />
      )}
      {screen === 'forgot-password' && (
        <ForgotPasswordScreen
          onBack={() => setScreen('sign-in')}
          onContinue={async (email) => {
            try {
              const result = await forgotPassword({ email });
              setRecoveryEmail(email);
              setRecoveryCode('');
              setOtpFlow('password-reset');
              setScreen('verify-otp');
              if (result.debugOtpCode) {
                showPopup('OTP generated (dev)', `Use code: ${result.debugOtpCode}`);
              } else {
                showPopup('Check your email', result.message);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to request OTP.';
              showPopup('Request failed', message);
            }
          }}
        />
      )}
      {screen === 'verify-otp' && (
        <VerifyOtpScreen
          onBack={() => setScreen('forgot-password')}
          onContinue={async (code) => {
            try {
              await verifyOtp({ email: recoveryEmail, code });
              if (otpFlow === 'signup') {
                showPopup('Email verified', 'Your account is verified. You can now sign in.');
                setScreen('sign-in');
                return;
              }
              setRecoveryCode(code);
              setScreen('reset-password');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'OTP verification failed.';
              showPopup('Invalid code', message);
            }
          }}
          onResend={async () => {
            if (!recoveryEmail) {
              showPopup('Missing email', 'Go back and enter your email first.');
              return;
            }
            try {
              const result = await forgotPassword({ email: recoveryEmail });
              if (result.debugOtpCode) {
                showPopup('New OTP generated (dev)', `Use code: ${result.debugOtpCode}`);
              } else {
                showPopup('Code sent', result.message);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Resend failed.';
              showPopup('Resend failed', message);
            }
          }}
        />
      )}
      {screen === 'reset-password' && (
        <ResetPasswordScreen
          onBack={() => setScreen('verify-otp')}
          onSave={async (password, confirmPassword) => {
            try {
              await resetPassword({
                email: recoveryEmail,
                code: recoveryCode,
                newPassword: password,
                confirmPassword
              });
              showPopup('Password updated', 'You can now sign in with your new password.');
              setScreen('sign-in');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Password reset failed.';
              showPopup('Reset failed', message);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  }
});

