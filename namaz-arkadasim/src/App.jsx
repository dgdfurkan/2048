import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import OneSignal from 'react-onesignal';
import { useEffect } from 'react';

const AppContent = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // OneSignal Init
    // Not: User kendi App ID'sini koymalı. Bunu environment variable veya settings'den alabiliriz.
    // Ancak basitlik için buraya placeholder koyacağız ve README'de değiştirmesini söyleyeceğiz.
    // Veya daha iyisi, GAS'tan bu config'i çekmek ama o karışık.
    // Kullanıcıya build etmeden önce burayı değiştirmesini söyleyeceğiz.
    try {
      OneSignal.init({
        appId: "ONESIGNAL_APP_ID_BURAYA", // Kullanıcı bunu değiştirecek
        allowLocalhostAsSecureOrigin: true,
      });
    } catch (e) {
      console.log("OneSignal init error", e);
    }
  }, []);

  useEffect(() => {
    if (user && user.username) {
       // Kullanıcı giriş yaptıysa OneSignal ID'sini alıp kaydedebiliriz
       // Ancak bunu GAS tarafında register anında yapmak daha mantıklı.
       // Veya burada ID'yi alıp update edebiliriz.
       OneSignal.getUserId().then(id => {
          if (id) {
             console.log("OneSignal ID:", id);
             // Bu ID'yi bir sonraki API isteğinde gönderebiliriz veya
             // Register olurken OneSignal.getUserId() yapıp gönderiyoruz zaten.
          }
       });
    }
  }, [user]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400">Yükleniyor...</div>;
  }

  return user ? <Dashboard /> : <AuthPage />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
