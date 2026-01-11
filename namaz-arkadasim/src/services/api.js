import axios from 'axios';

// Bu URL kullanıcı tarafından ayarlanacak.
// Geliştirme sırasında kolaylık olması için localStorage'dan veya bir sabitten alacağız.
// Kullanıcıya ilk girişte sorabiliriz veya config dosyasına yazdırabiliriz.
// Şimdilik localStorage'dan okuyalım, yoksa sorsun.

export const getApiUrl = () => {
  return localStorage.getItem('gas_api_url') || '';
};

export const setApiUrl = (url) => {
  localStorage.setItem('gas_api_url', url);
};

const api = {
  // Generic request wrapper
  request: async (action, data = {}) => {
    const url = getApiUrl();
    if (!url) throw new Error("API URL not set");

    try {
      // Google Apps Script bazen CORS hatası verebilir veya redirect edebilir.
      // fetch yerine axios kullanıyoruz ve 'text/plain' olarak gönderiyoruz (GAS quirk).
      // GAS usually handles POST requests best when sent as stringified body.

      // POST isteği
      const response = await axios.post(url, JSON.stringify({ action, ...data }), {
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
      });

      // GAS bazen 302 redirect yapar, axios bunu takip eder.
      return response.data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // GET isteği (URL parametreleri ile)
  get: async (params = {}) => {
    const url = getApiUrl();
    if (!url) throw new Error("API URL not set");

    try {
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error("API Get Error:", error);
        throw error;
    }
  }
};

export default api;
