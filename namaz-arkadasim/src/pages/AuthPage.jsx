import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api, { setApiUrl, getApiUrl } from '../services/api';
import { Settings, LogIn, UserPlus } from 'lucide-react';
import OneSignal from 'react-onesignal';

const AuthPage = () => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(!getApiUrl()); // Eğer URL yoksa direkt ayarları aç

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!apiUrl) {
      setError('Lütfen önce Ayarlar kısmından Google Script URL\'sini girin.');
      setLoading(false);
      return;
    }

    try {
      // URL'i kaydet (değişmiş olabilir)
      setApiUrl(apiUrl);

      if (isLogin) {
        // LOGIN
        // GET isteği ile login (GAS doGet)
        const res = await api.get({ action: 'login', username, password });
        if (res.status === 'success') {
          login(res.user);
        } else {
          setError(res.message || 'Giriş başarısız.');
        }
      } else {
        // REGISTER
        // OneSignal ID al
        let osId = '';
        try {
            osId = await OneSignal.getUserId();
        } catch (e) {
            console.log("OneSignal ID alınamadı", e);
        }

        // POST isteği ile register (GAS doPost)
        const res = await api.request('register', { username, password, onesignal_id: osId });
        if (res.status === 'success') {
          setIsLogin(true);
          setError('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
          setUsername('');
          setPassword('');
        } else {
          setError(res.message || 'Kayıt başarısız.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Bir bağlantı hatası oluştu. URL\'i kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme.background} p-4`}>
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden">
        {/* Dekoratif Arka Plan */}
        <div className={`absolute top-0 left-0 w-full h-2 ${theme.primary}`}></div>

        {/* Ayarlar Butonu */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 ${theme.text} transition-colors`}
        >
          <Settings size={20} />
        </button>

        <h1 className={`text-3xl font-bold text-center mb-2 ${theme.text}`}>Namaz Arkadaşım</h1>
        <p className="text-center text-gray-500 mb-8">Birlikte huzura...</p>

        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Script Web App URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrlState(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 text-sm"
              style={{ '--tw-ring-color': theme.primary.replace('bg-', '') }} // Hack for dynamic color
            />
            <p className="text-xs text-gray-400 mt-1">Kurulum rehberindeki URL'i buraya yapıştırın.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`w-full p-3 border ${theme.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full p-3 border ${theme.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg font-semibold shadow-md transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${theme.button} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'İşleniyor...' : (isLogin ? <><LogIn size={20} /> Giriş Yap</> : <><UserPlus size={20} /> Kayıt Ol</>)}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className={`text-sm font-medium hover:underline ${theme.accent}`}
          >
            {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
