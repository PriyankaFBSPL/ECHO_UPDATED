import React, { useEffect } from 'react';
import { useStore } from './store';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import VocabularyScreen from './screens/VocabularyScreen';
import ProgressScreen from './screens/ProgressScreen';
import TranslatorScreen from './screens/TranslatorScreen';
import Layout from './components/Layout';

const App: React.FC = () => {
  const { currentScreen, checkSession, isDarkMode } = useStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'practice':
        return <ChatScreen />;
      case 'vocabulary':
        return <VocabularyScreen />;
      case 'translator':
        return <TranslatorScreen />;
      case 'progress':
        return <ProgressScreen />;
      default:
        return <LoginScreen />;
    }
  };

  return (
    <Layout>
      {renderScreen()}
    </Layout>
  );
};

export default App;
