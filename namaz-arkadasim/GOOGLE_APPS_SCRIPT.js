/**
 * ============================================================================
 * GOOGLE APPS SCRIPT KODU (Backend)
 * ============================================================================
 *
 * BU KODU KOPYALAYIP GOOGLE SHEET'İN "UZANTILAR > APPS SCRIPT" BÖLÜMÜNE YAPIŞTIRIN.
 *
 * KURULUM:
 * 1. Google Sheet oluşturun.
 * 2. Şu sekmeleri (Tabs) oluşturun: "Users", "Rooms", "Logs", "Chat", "Content".
 * 3. Sütunlar:
 *    - Users: username, password, room_id, onesignal_id, created_at
 *    - Rooms: room_id, created_at
 *    - Logs: room_id, username, prayer_name, date, timestamp
 *    - Chat: room_id, username, message, timestamp
 *    - Content: prayer_name, content_text (Sure/Hadis), type (surah/hadith)
 * 4. Bu kodu yapıştırın.
 * 5. OneSignal App ID ve API Key bilgilerinizi aşağıya girin.
 * 6. "Dağıt" > "Yeni Dağıtım" > "Web Uygulaması" olarak dağıtın.
 *    - Erişim: "Herkes" (Anyone) seçin.
 * 7. Oluşan URL'i uygulamanızda kullanın.
 */

// --- AYARLAR ---
const ONESIGNAL_APP_ID = "BURAYA_ONESIGNAL_APP_ID_YAZIN";
const ONESIGNAL_API_KEY = "BURAYA_ONESIGNAL_REST_API_KEY_YAZIN";

function doGet(e) {
  const action = e.parameter.action;

  if (action === "login") {
    return loginUser(e.parameter.username, e.parameter.password);
  } else if (action === "get_data") {
    return getData(e.parameter.room_id);
  } else if (action === "get_content") {
    return getContent();
  }

  return ContentService.createTextOutput(JSON.stringify({error: "Invalid action"})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // doPost genellikle form verisi veya raw data olarak gelir.
  // React'ten genellikle JSON string olarak gönderilir.
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: "Invalid JSON"})).setMimeType(ContentService.MimeType.JSON);
  }

  const action = data.action;

  if (action === "register") {
    return registerUser(data.username, data.password, data.onesignal_id);
  } else if (action === "join_room") {
    return joinRoom(data.username, data.room_id);
  } else if (action === "log_prayer") {
    return logPrayer(data.username, data.room_id, data.prayer_name, data.is_checked);
  } else if (action === "send_message") {
    return sendMessage(data.username, data.room_id, data.message);
  }

  return ContentService.createTextOutput(JSON.stringify({error: "Invalid action"})).setMimeType(ContentService.MimeType.JSON);
}

// --- FONKSİYONLAR ---

function loginUser(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();

  // Başlık satırını atla (i=1)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == password) {
      return response({
        status: "success",
        user: {
          username: data[i][0],
          room_id: data[i][2]
        }
      });
    }
  }
  return response({status: "error", message: "Kullanıcı adı veya şifre yanlış."});
}

function registerUser(username, password, onesignal_id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();

  // Kullanıcı var mı kontrol et
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      return response({status: "error", message: "Bu kullanıcı adı zaten alınmış."});
    }
  }

  // Yeni kullanıcı ekle
  sheet.appendRow([username, password, "", onesignal_id, new Date()]);
  return response({status: "success", message: "Kayıt başarılı! Giriş yapabilirsiniz."});
}

function joinRoom(username, room_id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();

  let userFound = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      // Odayı güncelle (3. sütun index 2)
      sheet.getRange(i + 1, 3).setValue(room_id);
      userFound = true;
      break;
    }
  }

  if (userFound) {
    return response({status: "success", room_id: room_id});
  }
  return response({status: "error", message: "Kullanıcı bulunamadı."});
}

function getData(room_id) {
  if (!room_id) return response({status: "error", message: "Room ID required"});

  // 1. Oda üyelerini bul
  const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const usersData = usersSheet.getDataRange().getValues();
  let members = [];
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][2] == room_id) { // room_id match
      members.push(usersData[i][0]); // username
    }
  }

  // 2. Namaz Loglarını bul (Bugün için)
  const logsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Logs");
  const logsData = logsSheet.getDataRange().getValues();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  let logs = {};
  for (let i = 1; i < logsData.length; i++) {
    // logsData[i][3] date olmalı
    let rowDate = new Date(logsData[i][3]).toISOString().split('T')[0];

    if (logsData[i][0] == room_id && rowDate == today) {
       // logs[username] = { fajr: true, dhuhr: true ... }
       let u = logsData[i][1];
       let p = logsData[i][2];
       if (!logs[u]) logs[u] = {};
       logs[u][p] = true;
    }
  }

  // 3. Sohbet Mesajlarını bul (Son 20)
  const chatSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Chat");
  const chatData = chatSheet.getDataRange().getValues();
  let messages = [];

  // Sondan başa doğru tara
  for (let i = chatData.length - 1; i >= 1; i--) {
    if (chatData[i][0] == room_id) {
      messages.unshift({
        username: chatData[i][1],
        message: chatData[i][2],
        timestamp: chatData[i][3]
      });
      if (messages.length >= 20) break;
    }
  }

  return response({
    status: "success",
    data: {
      members: members,
      logs: logs,
      messages: messages
    }
  });
}

function getContent() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Content");
  const data = sheet.getDataRange().getValues();

  let content = [];
  for (let i = 1; i < data.length; i++) {
    content.push({
      prayer_name: data[i][0],
      text: data[i][1],
      type: data[i][2]
    });
  }

  return response({status: "success", content: content});
}

function logPrayer(username, room_id, prayer_name, is_checked) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Logs");

  // Eğer işaretlendiyse ekle
  if (is_checked) {
    sheet.appendRow([room_id, username, prayer_name, new Date(), new Date().toLocaleTimeString()]);

    // BİLDİRİM GÖNDER
    sendNotificationToRoom(room_id, username, `${username} ${prayer_name} namazını kıldı! 🤲`);
  } else {
    // İşaret kaldırıldıysa... (Opsiyonel: silme işlemi karmaşık olabilir, şimdilik sadece ekleme yapalım veya son kaydı silelim)
    // Basitlik için log tutuyoruz, frontend en son durumu gösterebilir veya bugün loglanmış mı diye bakar.
    // Veritabanı yapımız "log" olduğu için silmek yerine "unchecked" diye bir log da atabiliriz ama
    // şimdilik sadece "kılındı" bilgisini tutmak daha motive edici.
    // Kullanıcı işareti kaldırırsa sheet'ten silmek zor olabilir.
    // Çözüm: Logları okurken hepsini okuyoruz.
    // Hatta basit olsun: Her zaman ekle. Frontend bugün var mı diye bakar.
    // İşareti kaldırmak için: Loglara "removed" diye ekleyebiliriz ama kafa karıştırır.
    // Şimdilik sadece check edilebilsin :)
  }

  return response({status: "success"});
}

function sendMessage(username, room_id, message) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Chat");
  sheet.appendRow([room_id, username, message, new Date()]);

  // Bildirim gönder (Opsiyonel, çok sık olabilir. Şimdilik gönderelim)
  sendNotificationToRoom(room_id, username, `${username}: ${message}`);

  return response({status: "success"});
}

// --- YARDIMCI FONKSİYONLAR ---

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationToRoom(room_id, sender_username, message_text) {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes("BURAYA")) return; // Ayarlanmamışsa geç

  // Odedaki diğer kişilerin OneSignal ID'lerini bul
  const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const usersData = usersSheet.getDataRange().getValues();

  let playerIds = [];

  for (let i = 1; i < usersData.length; i++) {
    // Aynı odada ama gönderen kişi değilse
    if (usersData[i][2] == room_id && usersData[i][0] != sender_username) {
      let pid = usersData[i][3]; // onesignal_id
      if (pid) playerIds.push(pid);
    }
  }

  if (playerIds.length === 0) return;

  // OneSignal API İsteği
  const url = "https://onesignal.com/api/v1/notifications";
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    contents: { en: message_text },
    headings: { en: "Namaz Arkadaşım" }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Basic " + ONESIGNAL_API_KEY
    },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Bildirim hatası: " + e.toString());
  }
}
