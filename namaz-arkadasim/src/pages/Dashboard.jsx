import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { LogOut, RefreshCw, Send, CheckCircle, Circle, MapPin, Moon, Sun, MessageCircle, Heart, Palette } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import OneSignal from 'react-onesignal';

const PRAYER_NAMES = {
  Fajr: "Sabah",
  Dhuhr: "Öğle",
  Asr: "İkindi",
  Maghrib: "Akşam",
  Isha: "Yatsı"
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, changeTheme, themes } = useTheme();

  // Data States
  const [loading, setLoading] = useState(true);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [city, setCity] = useState(localStorage.getItem('namaz_city') || 'Istanbul');
  const [district, setDistrict] = useState(localStorage.getItem('namaz_district') || '');

  // Chat State
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);

  // Content Modal
  const [showContent, setShowContent] = useState(false);
  const [contentData, setContentData] = useState(null);

  // OneSignal Init (Basit Check)
  useEffect(() => {
    // OneSignal başlatma işlemi normalde App.jsx'te olur ama burada ID update yapacağız
    // Şimdilik pas geçiyoruz, kurulum rehberinde anlatacağız.
  }, []);

  // Initial Data Load
  useEffect(() => {
    fetchData();
    fetchPrayerTimes();

    // Polling for chat/logs (Every 10 seconds)
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.messages]);

  const fetchPrayerTimes = async () => {
    try {
      // Aladhan API
      // City search logic is complex, defaulting to Istanbul for MVP or simple input
      // Kullanıcıdan basit text input alıp API'ye soralım.
      const today = new Date();
      const dateStr = format(today, 'dd-MM-yyyy');
      const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=Turkey&method=13`); // Method 13: Diyanet
      setPrayerTimes(res.data.data.timings);
    } catch (error) {
      console.error("Prayer times error:", error);
    }
  };

  const fetchData = async () => {
    if (!user.room_id) return;
    try {
      const res = await api.get({ action: 'get_data', room_id: user.room_id });
      if (res.status === 'success') {
        setRoomData(res.data);
      }
    } catch (error) {
      console.error("Data fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await api.request('join_room', { username: user.username, room_id: roomId });
      if (res.status === 'success') {
        // Auth user'ı güncellememiz lazım ama basitçe reload yapalım veya user objesini güncelleyelim
        // Ancak AuthContext'te update metodu yok, logout yapıp girmesi gerekebilir veya sayfayı yenilemek.
        // Basit çözüm:
        const newUser = { ...user, room_id: roomId };
        localStorage.setItem('namaz_user', JSON.stringify(newUser));
        window.location.reload();
      }
    } catch (e) {
      alert("Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handlePrayerCheck = async (prayerKey, isChecked) => {
    // Optimistic Update
    // ...

    // Backend Call
    const prayerName = PRAYER_NAMES[prayerKey];
    await api.request('log_prayer', {
        username: user.username,
        room_id: user.room_id,
        prayer_name: prayerName,
        is_checked: isChecked
    });

    // Fetch Content if checked
    if (isChecked) {
        // Şimdilik hardcoded veya API'den çekebilirdik.
        // API'den "get_content" ile tüm içeriği çekip içinden seçebiliriz.
        const contentRes = await api.get({ action: 'get_content' });
        if (contentRes.status === 'success' && contentRes.content.length > 0) {
            // Rastgele veya namaz adına göre filtrele
            // Basitlik için rastgele bir içerik gösterelim
            const randomContent = contentRes.content[Math.floor(Math.random() * contentRes.content.length)];
            setContentData(randomContent);
            setShowContent(true);
        } else {
             // Fallback
             setContentData({ text: "Allah kabul etsin!", type: "Dua" });
             setShowContent(true);
        }
    }

    fetchData(); // Refresh logs
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const msg = message;
    setMessage(''); // Clear input immediately

    await api.request('send_message', {
        username: user.username,
        room_id: user.room_id,
        message: msg
    });

    fetchData(); // Refresh chat
  };

  // --- RENDER HELPERS ---

  if (!user.room_id) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.background} p-4`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <Heart className={`mx-auto w-16 h-16 ${theme.text} mb-4`} />
            <h2 className="text-2xl font-bold mb-2">Hoşgeldin {user.username}!</h2>
            <p className="text-gray-600 mb-6">Henüz bir odada değilsin. Eşinle aynı odaya girmek için bir oda ismi belirleyin.</p>

            <form onSubmit={(e) => { e.preventDefault(); handleJoinRoom(e.target.roomId.value); }}>
                <input name="roomId" type="text" placeholder="Örn: huzur_yuvam" className="w-full p-3 border rounded-lg mb-4 text-center" required />
                <button type="submit" className={`w-full p-3 rounded-lg font-bold ${theme.button}`}>Odaya Katıl</button>
            </form>
            <button onClick={logout} className="mt-4 text-sm text-gray-500 hover:underline">Çıkış Yap</button>
        </div>
      </div>
    );
  }

  const myLogs = roomData?.logs?.[user.username] || {};
  const partnerName = roomData?.members?.find(m => m !== user.username);
  const partnerLogs = partnerName ? (roomData?.logs?.[partnerName] || {}) : {};

  return (
    <div className={`min-h-screen ${theme.background} pb-20 md:pb-0`}>
        {/* Header */}
        <header className={`bg-white shadow-sm p-4 sticky top-0 z-10`}>
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${theme.secondary}`}>
                        <Heart size={20} className={theme.accent} />
                    </div>
                    <div>
                        <h1 className={`font-bold text-lg leading-tight ${theme.text}`}>Namaz Arkadaşım</h1>
                        <p className="text-xs text-gray-500">Oda: {user.room_id}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                   {/* Theme Switcher Tiny */}
                   <div className="relative group">
                        <button className="p-2 text-gray-400 hover:text-gray-600"><Palette size={20}/></button>
                        <div className="absolute right-0 top-full mt-2 bg-white shadow-xl rounded-lg p-2 hidden group-hover:flex gap-1 border border-gray-100">
                            {Object.keys(themes).map(t => (
                                <button key={t} onClick={() => changeTheme(t)} className={`w-6 h-6 rounded-full ${themes[t].primary}`} title={themes[t].name} />
                            ))}
                        </div>
                   </div>
                   <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500"><LogOut size={20}/></button>
                </div>
            </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 grid gap-6 md:grid-cols-2">

            {/* SOL KOLON: Namaz Takibi */}
            <div className="space-y-6">
                {/* Namaz Vakitleri & Şehir */}
                <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <MapPin size={16} />
                            <input
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                onBlur={() => { localStorage.setItem('namaz_city', city); fetchPrayerTimes(); }}
                                className="border-b border-dashed border-gray-300 focus:outline-none w-24"
                            />
                        </div>
                        <span className="text-xs font-mono text-gray-400">{format(new Date(), 'dd MMM yyyy', { locale: tr })}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center">
                        {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((key) => (
                            <div key={key} className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{PRAYER_NAMES[key]}</span>
                                <span className={`font-bold ${theme.text} text-sm`}>{prayerTimes ? prayerTimes[key] : '--:--'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Namaz Listesi Checkboxları */}
                <div className="bg-white rounded-2xl shadow-sm p-2 border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className={`${theme.secondary}`}>
                            <tr>
                                <th className="p-3 text-left text-xs font-semibold text-gray-600">Vakit</th>
                                <th className="p-3 text-center text-xs font-semibold text-gray-600">Sen</th>
                                <th className="p-3 text-center text-xs font-semibold text-gray-600">{partnerName || 'Eşin'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((key) => {
                                const isMyChecked = !!myLogs[PRAYER_NAMES[key]];
                                const isPartnerChecked = !!partnerLogs[PRAYER_NAMES[key]];

                                return (
                                    <tr key={key} className="border-b last:border-0 border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-3">
                                            <span className={`font-medium ${theme.text}`}>{PRAYER_NAMES[key]}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => !isMyChecked && handlePrayerCheck(key, true)}
                                                disabled={isMyChecked}
                                                className={`transition-all duration-300 transform ${isMyChecked ? 'scale-110' : 'hover:scale-110 opacity-50 hover:opacity-100'}`}
                                            >
                                                {isMyChecked ?
                                                    <CheckCircle className={`text-white ${theme.accent}`} size={24} fill="currentColor" /> :
                                                    <Circle className="text-gray-300" size={24} />
                                                }
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                             <div className={`transition-all duration-500 ${isPartnerChecked ? 'scale-110' : 'opacity-30'}`}>
                                                {isPartnerChecked ?
                                                    <CheckCircle className="text-green-500 bg-white rounded-full" size={24} fill="currentColor" /> :
                                                    <Circle className="text-gray-200" size={24} />
                                                }
                                             </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SAĞ KOLON: Sohbet */}
            <div className="h-[500px] md:h-auto bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className={`p-3 border-b border-gray-100 flex items-center gap-2 ${theme.secondary}`}>
                    <MessageCircle size={18} className={theme.text} />
                    <span className={`font-semibold text-sm ${theme.text}`}>Sohbet</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {roomData?.messages?.map((msg, i) => {
                        const isMe = msg.username === user.username;
                        return (
                            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? `${theme.primary} text-white rounded-br-none` : 'bg-white text-gray-700 rounded-bl-none'}`}>
                                    {msg.message}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">
                                    {msg.username}, {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                                </span>
                            </div>
                        )
                    })}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Bir şeyler yaz..."
                        className="flex-1 bg-gray-50 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-opacity-50 text-sm focus:outline-none"
                        style={{ '--tw-ring-color': theme.primary }}
                    />
                    <button type="submit" className={`p-2 rounded-full ${theme.button} transition-transform active:scale-95`}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </main>

        {/* CONTENT MODAL */}
        {showContent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden text-center transform transition-all scale-100">
                     <div className={`absolute top-0 left-0 w-full h-3 ${theme.primary}`}></div>
                     <h3 className={`text-xl font-bold mb-4 ${theme.text}`}>Allah Kabul Etsin! 🤲</h3>

                     <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-2 block">{contentData?.type || 'Bilgi'}</span>
                        <p className="text-gray-700 italic leading-relaxed">"{contentData?.text}"</p>
                     </div>

                     <button
                        onClick={() => setShowContent(false)}
                        className={`w-full py-3 rounded-xl font-bold ${theme.button}`}
                     >
                        Amin
                     </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;
