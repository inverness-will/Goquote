import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
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

export default function App() {
  const [screen, setScreen] = useState<
    'sign-in' | 'sign-up' | 'forgot-password' | 'verify-otp' | 'reset-password'
  >('sign-in');
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
        />
      )}
      {screen === 'sign-up' && <SignUpScreen onSignIn={() => setScreen('sign-in')} />}
      {screen === 'forgot-password' && (
        <ForgotPasswordScreen
          onBack={() => setScreen('sign-in')}
          onContinue={() => setScreen('verify-otp')}
        />
      )}
      {screen === 'verify-otp' && (
        <VerifyOtpScreen
          onBack={() => setScreen('forgot-password')}
          onContinue={() => setScreen('reset-password')}
        />
      )}
      {screen === 'reset-password' && (
        <ResetPasswordScreen
          onBack={() => setScreen('verify-otp')}
          onSave={() => setScreen('sign-in')}
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

