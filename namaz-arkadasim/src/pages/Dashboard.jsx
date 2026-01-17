import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { LogOut, Send, Check, MapPin, MessageCircle, Heart, Palette, Loader2, Home, Settings, Lock, User } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const PRAYER_NAMES = {
  Fajr: "Sabah",
  Dhuhr: "Öğle",
  Asr: "İkindi",
  Maghrib: "Akşam",
  Isha: "Yatsı"
};

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, changeTheme, themes } = useTheme();

  // View State (Tabs)
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'chat', 'settings'

  // Data States
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [partnerPrayerTimes, setPartnerPrayerTimes] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [city, setCity] = useState(localStorage.getItem('namaz_city') || 'Istanbul');
  const [nextPrayer, setNextPrayer] = useState(null);

  // Chat State
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);
  const [messagesLength, setMessagesLength] = useState(0);

  // Content Modal
  const [showContent, setShowContent] = useState(false);
  const [contentData, setContentData] = useState(null);

  useEffect(() => {
    fetchData();
    fetchPrayerTimes();

    // Check for date change (Midnight reset logic)
    const checkDate = setInterval(() => {
         const lastDate = localStorage.getItem('last_active_date');
         const today = new Date().toLocaleDateString();
         if (lastDate && lastDate !== today) {
             window.location.reload(); // Hard refresh to clear optimistic states and fetch fresh
         }
         localStorage.setItem('last_active_date', today);
    }, 60000);

    const interval = setInterval(fetchData, 10000);
    return () => {
        clearInterval(interval);
        clearInterval(checkDate);
    };
  }, []);

  // Update city in backend
  useEffect(() => {
      if (city && user.username) {
        api.request('update_city', { username: user.username, city: city }).catch(console.error);
      }
  }, [city]);

  // Fetch Partner's Prayer Times
  useEffect(() => {
    if (roomData?.memberCities) {
        const partnerName = roomData?.members?.find(m => m !== user.username);
        const partnerCity = partnerName ? roomData.memberCities[partnerName] : null;

        if (partnerCity && partnerCity !== city) {
            fetchPartnerPrayerTimes(partnerCity);
        }
    }
  }, [roomData, city]);

  const fetchPartnerPrayerTimes = async (pCity) => {
      try {
        const today = new Date();
        const dateStr = format(today, 'dd-MM-yyyy');
        const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${pCity}&country=Turkey&method=13`);
        setPartnerPrayerTimes(res.data.data.timings);
      } catch (error) {
        console.error("Partner prayer times error:", error);
      }
  };

  useEffect(() => {
    if (activeTab === 'chat' && roomData?.messages?.length > messagesLength) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        setMessagesLength(roomData.messages.length);
    }
  }, [roomData?.messages, activeTab]);

  const fetchPrayerTimes = async () => {
    try {
      const today = new Date();
      const dateStr = format(today, 'dd-MM-yyyy');
      const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=Turkey&method=13`);
      setPrayerTimes(res.data.data.timings);
      calculateNextPrayer(res.data.data.timings);
    } catch (error) {
      console.error("Prayer times error:", error);
    }
  };

  const calculateNextPrayer = (timings) => {
      const now = new Date();
      const timeStr = format(now, "HH:mm");
      const prayers = [
          { key: 'Fajr', time: timings.Fajr },
          { key: 'Sunrise', time: timings.Sunrise },
          { key: 'Dhuhr', time: timings.Dhuhr },
          { key: 'Asr', time: timings.Asr },
          { key: 'Maghrib', time: timings.Maghrib },
          { key: 'Isha', time: timings.Isha },
      ];

      for (let p of prayers) {
          if (p.time > timeStr) {
              setNextPrayer(p);
              return;
          }
      }
      setNextPrayer({ key: 'Fajr', time: timings.Fajr, tomorrow: true });
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

  const handlePrayerCheck = async (prayerKey, isChecked) => {
    const prayerName = PRAYER_NAMES[prayerKey];

    // OPTIMISTIC UPDATE
    const prevRoomData = { ...roomData };
    if (!prevRoomData.logs) prevRoomData.logs = {};
    if (!prevRoomData.logs[user.username]) prevRoomData.logs[user.username] = {};
    prevRoomData.logs[user.username][prayerName] = isChecked;
    setRoomData(prevRoomData);

    // SYNC
    setSyncing(true);
    try {
        await api.request('log_prayer', {
            username: user.username,
            room_id: user.room_id,
            prayer_name: prayerName,
            is_checked: isChecked
        });

        if (isChecked) {
            const contentRes = await api.get({ action: 'get_content' });
            if (contentRes.status === 'success' && contentRes.content.length > 0) {
                // Filter content based on prayerName or 'Hepsi'
                const filteredContent = contentRes.content.filter(c =>
                    !c.prayer_name ||
                    c.prayer_name.toLowerCase() === 'hepsi' ||
                    c.prayer_name.toLowerCase() === prayerName.toLowerCase() ||
                    c.prayer_name.toLowerCase() === prayerKey.toLowerCase()
                );

                const pool = filteredContent.length > 0 ? filteredContent : contentRes.content;
                const randomContent = pool[Math.floor(Math.random() * pool.length)];

                setContentData(randomContent);
                setShowContent(true);
            } else {
                setContentData({ text: "Allah kabul etsin!", type: "Dua" });
                setShowContent(true);
            }
        }
    } catch (e) {
        console.error("Sync error", e);
    } finally {
        setSyncing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const msgText = message;
    setMessage('');

    const newMsg = {
        username: user.username,
        message: msgText,
        timestamp: new Date().toISOString()
    };

    const prevRoomData = { ...roomData };
    if (!prevRoomData.messages) prevRoomData.messages = [];
    prevRoomData.messages.push(newMsg);
    setRoomData(prevRoomData);

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    setSyncing(true);
    try {
        await api.request('send_message', {
            username: user.username,
            room_id: user.room_id,
            message: msgText
        });
    } catch (e) {
        console.error("Message send error", e);
    } finally {
        setSyncing(false);
    }
  };

  const isPrayerTimePassed = (prayerKey) => {
      if (!prayerTimes) return false;
      const now = new Date();
      const timeStr = format(now, "HH:mm");
      // Basic check: is Current Time >= Prayer Time?
      // For simplicity, we compare strings "HH:mm"
      return timeStr >= prayerTimes[prayerKey];
  };

  // --- SUB-COMPONENTS ---

  const PrayerCard = ({ pKey, myLogs, partnerLogs }) => {
      const isMyChecked = !!myLogs[PRAYER_NAMES[pKey]];
      const isPartnerChecked = !!partnerLogs[PRAYER_NAMES[pKey]];
      const isTimePassed = isPrayerTimePassed(pKey);

      let displayTime = prayerTimes ? prayerTimes[pKey] : '--:--';
      if (pKey === 'Fajr' && prayerTimes) displayTime = `${prayerTimes.Fajr}-${prayerTimes.Sunrise}`;

      return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-3 ${isMyChecked ? 'bg-green-50/50' : ''}`}
        >
            <div className="flex flex-col">
                <span className={`text-sm font-bold ${theme.text} uppercase tracking-wide opacity-80`}>{PRAYER_NAMES[pKey]}</span>
                <span className="text-xs text-gray-500 font-medium mt-0.5">{displayTime}</span>
            </div>

            <div className="flex items-center gap-4">
                {/* Partner Status (Small) */}
                <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-400 mb-1">Eşin</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isPartnerChecked ? 'bg-green-100 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                        {isPartnerChecked ? <Check size={14} className="text-green-600" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                    </div>
                </div>

                {/* My Checkbox (Big) */}
                <button
                    onClick={() => handlePrayerCheck(pKey, true)}
                    disabled={isMyChecked || !isTimePassed}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative overflow-hidden
                        ${!isTimePassed ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}
                        ${isTimePassed && !isMyChecked ? `${theme.primary} text-white shadow-lg active:scale-90` : ''}
                        ${isMyChecked ? 'bg-green-500 text-white cursor-default' : ''}
                    `}
                >
                    {!isTimePassed && <Lock size={16} className="text-gray-400" />}

                    {isTimePassed && !isMyChecked && <div className="w-4 h-4 rounded-full border-2 border-white/50" />}

                    {isMyChecked && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1.2 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        >
                            <Check size={28} strokeWidth={3} />
                        </motion.div>
                    )}
                </button>
            </div>
        </motion.div>
      );
  };

  // --- VIEWS ---

  const HomeView = () => {
      const myLogs = roomData?.logs?.[user.username] || {};
      const partnerName = roomData?.members?.find(m => m !== user.username);
      const partnerLogs = partnerName ? (roomData?.logs?.[partnerName] || {}) : {};

      return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            {/* Header / Next Prayer */}
            <div className={`rounded-3xl p-6 text-white shadow-lg ${theme.primary} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Heart size={64} />
                </div>
                <div className="relative z-10">
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">Sıradaki Vakit</p>
                    <h2 className="text-3xl font-bold mb-2">
                        {nextPrayer ? (PRAYER_NAMES[nextPrayer.key] || nextPrayer.key) : '...'}
                    </h2>
                    <p className="text-white/90 text-lg font-medium">
                        {nextPrayer ? nextPrayer.time : '--:--'}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-white/70 text-xs bg-white/10 w-fit px-3 py-1 rounded-full">
                        <MapPin size={12} />
                        <span>{city}</span>
                    </div>
                </div>
            </div>

            {/* List */}
            <div>
                {PRAYER_ORDER.map(key => (
                    <PrayerCard key={key} pKey={key} myLogs={myLogs} partnerLogs={partnerLogs} />
                ))}
            </div>
        </div>
      );
  };

  const ChatView = () => {
      return (
          <div className="flex flex-col h-[calc(100vh-80px)] pt-4 pb-2">
              <div className="px-4 pb-2 border-b border-gray-100">
                  <h2 className={`text-xl font-bold ${theme.text}`}>Sohbet</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                      {roomData?.members?.length > 1 ? `${roomData.members.find(m => m !== user.username)} ile` : 'Eşin bekleniyor...'}
                      {syncing && <Loader2 size={10} className="animate-spin text-blue-500" />}
                  </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {roomData?.messages?.map((msg, i) => {
                      const isMe = msg.username === user.username;
                      return (
                          <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={i}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                              <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${isMe ? `${theme.primary} text-white rounded-br-none` : 'bg-white text-gray-700 rounded-bl-none border border-gray-100'}`}>
                                  {msg.message}
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1 px-1">
                                  {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                              </span>
                          </motion.div>
                      )
                  })}
                  <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Mesaj yaz..."
                        className="flex-1 bg-gray-50 border-0 rounded-full px-5 py-3 focus:ring-2 focus:ring-opacity-50 text-sm focus:outline-none transition-all"
                        style={{ '--tw-ring-color': theme.primary }}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim()}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-90 disabled:opacity-50 disabled:active:scale-100 ${theme.button.split(' ')[0]}`} // bg color only
                    >
                        <Send size={20} />
                    </button>
                </form>
              </div>
          </div>
      );
  };

  const SettingsView = () => {
      return (
          <div className="p-4 pt-8 space-y-6">
              <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Ayarlar</h2>

              {/* Profile Card */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full ${theme.secondary} flex items-center justify-center`}>
                      <User size={24} className={theme.accent} />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-800">{user.username}</h3>
                      <p className="text-sm text-gray-500">Oda: {user.room_id}</p>
                  </div>
              </div>

              {/* City */}
              <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 ml-1">Şehir</label>
                  <div className="bg-white p-2 rounded-xl border border-gray-200 flex items-center">
                      <MapPin className="ml-2 text-gray-400" size={18} />
                      <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          onBlur={() => { localStorage.setItem('namaz_city', city); fetchPrayerTimes(); }}
                          className="w-full p-2 outline-none text-gray-700 font-medium"
                      />
                  </div>
              </div>

              {/* Themes */}
              <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 ml-1">Tema</label>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.keys(themes).map(t => (
                        <button
                            key={t}
                            onClick={() => changeTheme(t)}
                            className={`h-12 rounded-xl border-2 transition-all ${themes[t].primary} ${theme.name === themes[t].name ? 'border-gray-800 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                            title={themes[t].name}
                        />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">{theme.name}</p>
              </div>

              <button onClick={logout} className="w-full p-4 mt-8 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  <LogOut size={20} /> Çıkış Yap
              </button>
          </div>
      );
  };

  if (!user.room_id) {
    // Basic Join Room screen (kept simple)
    const handleJoin = async (e) => {
        e.preventDefault();
        const rid = e.target.roomId.value;
        setLoading(true);
        try {
            await api.request('join_room', { username: user.username, room_id: rid });
            const newUser = { ...user, room_id: rid };
            localStorage.setItem('namaz_user', JSON.stringify(newUser));
            window.location.reload();
        } catch { alert("Hata"); setLoading(false); }
    };

    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.background} p-4`}>
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <Heart className={`mx-auto w-16 h-16 ${theme.text} mb-4`} />
            <h2 className="text-2xl font-bold mb-2">Hoşgeldin {user.username}!</h2>
            <p className="text-gray-600 mb-6">Bir odaya katılın.</p>
            <form onSubmit={handleJoin}>
                <input name="roomId" placeholder="Oda İsmi" className="w-full p-4 bg-gray-50 rounded-xl mb-4 text-center font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100" required />
                <button className={`w-full p-4 rounded-xl font-bold text-white shadow-lg ${theme.button.split(' ')[0]}`}>Başla</button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.background} overflow-hidden font-sans text-gray-800`}>
        {/* MAIN CONTENT AREA */}
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="h-full pb-20 overflow-y-auto" // Add padding bottom for navbar
            >
                {activeTab === 'home' && <HomeView />}
                {activeTab === 'chat' && <ChatView />}
                {activeTab === 'settings' && <SettingsView />}
            </motion.div>
        </AnimatePresence>

        {/* BOTTOM NAVBAR */}
        <div className="fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-white/50 p-2 flex justify-around items-center z-50 max-w-md mx-auto">
            <button
                onClick={() => setActiveTab('home')}
                className={`p-3 rounded-full transition-all ${activeTab === 'home' ? `${theme.primary} text-white shadow-lg scale-110` : 'text-gray-400 hover:bg-gray-100'}`}
            >
                <Home size={24} />
            </button>
            <button
                onClick={() => setActiveTab('chat')}
                className={`p-3 rounded-full transition-all ${activeTab === 'chat' ? `${theme.primary} text-white shadow-lg scale-110` : 'text-gray-400 hover:bg-gray-100'}`}
            >
                <MessageCircle size={24} />
            </button>
            <button
                onClick={() => setActiveTab('settings')}
                className={`p-3 rounded-full transition-all ${activeTab === 'settings' ? `${theme.primary} text-white shadow-lg scale-110` : 'text-gray-400 hover:bg-gray-100'}`}
            >
                <Settings size={24} />
            </button>
        </div>

        {/* CONTENT MODAL (Sweet Popup) */}
        <AnimatePresence>
            {showContent && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center relative overflow-hidden"
                    >
                        <div className={`absolute top-0 left-0 w-full h-3 ${theme.primary}`}></div>
                        <h3 className={`text-2xl font-bold mb-4 ${theme.text}`}>Allah Kabul Etsin! 🤲</h3>
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-6">
                            <span className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-3 block">{contentData?.type || 'Bilgi'}</span>
                            <p className="text-gray-700 italic leading-relaxed text-lg">"{contentData?.text}"</p>
                        </div>
                        <button
                            onClick={() => setShowContent(false)}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg ${theme.button.split(' ')[0]} active:scale-95 transition-transform`}
                        >
                            Amin
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Dashboard;
