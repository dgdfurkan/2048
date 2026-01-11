# Namaz Arkadaşım - Kurulum Rehberi

Bu projeyi hayata geçirmek için 3 temel adımı tamamlamanız gerekiyor: **Google Sheets (Veritabanı)**, **OneSignal (Bildirimler)** ve **Netlify (Web Sitesi Yayını)**.

Her adımı sırasıyla uygulayın.

---

## 1. Adım: Google Sheets & Script Kurulumu (Veritabanı)

Web sitesinin tüm verileri (kullanıcılar, sohbetler, namaz takibi) sizin Google Sheet tablonuzda tutulacak.

1.  **Yeni bir Google Sheet oluşturun:**
    *   [sheets.new](https://sheets.new) adresine gidin.
    *   Dosya adını `Namaz Arkadaşım DB` yapın.

2.  **Sekmeleri (Tabs) Oluşturun:**
    Ekranın altındaki `+` butonuna basarak aşağıdaki isimlerde 5 adet sayfa oluşturun (isimler tam olarak böyle olmalı, büyük/küçük harfe dikkat):
    *   `Users`
    *   `Rooms`
    *   `Logs`
    *   `Chat`
    *   `Content`

3.  **Başlık Satırlarını Ekleyin (İlk satırlar):**
    Her sayfanın 1. satırına şu başlıkları yazın:
    *   **Users:** `username`, `password`, `room_id`, `onesignal_id`, `created_at`
    *   **Rooms:** `room_id`, `created_at`
    *   **Logs:** `room_id`, `username`, `prayer_name`, `date`, `timestamp`
    *   **Chat:** `room_id`, `username`, `message`, `timestamp`
    *   **Content:** `prayer_name`, `content_text`, `type`

4.  **Content (İçerik) Ekleme:**
    `Content` sayfasına namaz sonrası çıkacak dua/ayet/hadisleri ekleyebilirsiniz. Örnek:
    *   A2: `Hepsi` | B2: `Namaz dinin direğidir.` | C2: `Hadis`
    *   A3: `Hepsi` | B3: `Allah kabul etsin canım.` | C3: `Mesaj`

5.  **Google Apps Script Kodunu Yükleme:**
    *   Google Sheet açıkken üst menüden **Uzantılar > Apps Script**'e tıklayın.
    *   Açılan sayfadaki kod editöründeki her şeyi silin.
    *   Size verdiğim `GOOGLE_APPS_SCRIPT.js` dosyasındaki tüm kodu kopyalayıp buraya yapıştırın.
    *   **Kaydet** (Disket ikonu) butonuna basın.

---

## 2. Adım: OneSignal Kurulumu (Bildirimler)

Tarayıcı kapalıyken bile bildirim gelmesi için OneSignal kullanacağız.

1.  [onesignal.com](https://onesignal.com) adresine gidin ve ücretsiz hesap açın.
2.  **New App/Website** butonuna tıklayın.
    *   Adına `Namaz Arkadaşım` diyebilirsiniz.
    *   Platform olarak **Web**'i seçin.
    *   **Next** deyin.
3.  **Web Configuration:**
    *   **Choose Integration:** `Custom Code` seçin (React kullanıyoruz).
    *   **Site Setup:**
        *   Site Name: `Namaz Arkadaşım`
        *   Site URL: Şimdilik `http://localhost:5173` yazın (Netlify'a atınca güncelleyeceğiz).
    *   **Save** deyin.
4.  **Keys (Anahtarlar):**
    *   Size `App ID` ve `API Key` verecek. Bunları bir kenara not edin.
    *   **ÖNEMLİ:**
        *   Google Apps Script kodundaki `ONESIGNAL_APP_ID` ve `ONESIGNAL_API_KEY` kısımlarına bu değerleri yapıştırın ve Script'i tekrar kaydedin.
        *   Bilgisayarınızdaki proje klasöründe `src/App.jsx` dosyasını açın. Oradaki `ONESIGNAL_APP_ID_BURAYA` yazan yere `App ID`nizi yapıştırın.

---

## 3. Adım: Backend'i Yayınlama

1.  Apps Script ekranına geri dönün.
2.  Sağ üstteki **Dağıt (Deploy)** butonuna basın -> **Yeni Dağıtım (New Deployment)**.
3.  **Tür seçin:** Dişli çark ikonundan **Web Uygulaması (Web App)** seçin.
4.  **Ayarlar:**
    *   Açıklama: `v1`
    *   Yürütme kimliği: `Ben (kendi mail adresiniz)`
    *   **Erişim:** `Herkes (Anyone)` -> **BU ÇOK ÖNEMLİ!** Yoksa çalışmaz.
5.  **Dağıt** butonuna basın.
6.  Size bir **Web App URL** verecek (`https://script.google.com/...`). Bu linki kopyalayın.

---

## 4. Adım: Web Sitesini Yayınlama (Netlify)

1.  Bilgisayarınızdaki `namaz-arkadasim` klasöründe terminali açın (veya VS Code terminali).
2.  `npm run build` komutunu çalıştırın.
    *   Bu işlem `dist` adında bir klasör oluşturacak.
3.  [netlify.com](https://netlify.com) adresine gidin ve giriş yapın.
4.  **Add new site** -> **Deploy manually** seçeneğini seçin.
5.  Oluşan `dist` klasörünü sürükleyip Netlify ekranındaki alana bırakın.
6.  Siteniz yayında! Size rastgele bir isim verecek (örn: `happy-flower-123.netlify.app`).
    *   **Site Settings > Change site name** diyerek ismini değiştirebilirsiniz (örn: `bizim-namaz-arkadasim.netlify.app`).

## 5. Adım: Son Ayarlar

1.  **OneSignal URL Güncellemesi:**
    *   OneSignal paneline gidin -> Settings -> Web Configuration.
    *   Site URL kısmını yeni Netlify adresinizle (https://...) değiştirin.
    *   Save deyin.
2.  **Uygulamaya Giriş:**
    *   Netlify adresinize gidin.
    *   Login ekranındaki "Ayarlar (Dişli Çark)" butonuna basın.
    *   3. Adımda kopyaladığınız **Google Script Web App URL**'ini buraya yapıştırın.
    *   Kayıt Ol diyerek kullanıcı oluşturun.

Artık kullanıma hazır! Allah kabul etsin. 🤲
