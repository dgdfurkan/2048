/**
 * ============================================================================
 * GOOGLE APPS SCRIPT KODU (Backend - v2 Optimized)
 * ============================================================================
 *
 * BU KODU KOPYALAYIP GOOGLE SHEET'İN "UZANTILAR > APPS SCRIPT" BÖLÜMÜNE YAPIŞTIRIN.
 *
 * KURULUM:
 * 1. Google Sheet oluşturun.
 * 2. Şu sekmeleri (Tabs) oluşturun: "Users", "Rooms", "Logs", "Chat", "Content".
 * 3. Sütunlar:
 *    - Users: username, password, room_id, onesignal_id, created_at, city
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
const CACHE_DURATION = 30; // Saniye (Cache süresi)

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
  } else if (action === "update_city") {
    return updateCity(data.username, data.city);
  }

  return ContentService.createTextOutput(JSON.stringify({error: "Invalid action"})).setMimeType(ContentService.MimeType.JSON);
}

// --- FONKSİYONLAR ---

function getSheetData(sheetName) {
  // Önbellekten okumayı dene (Sadece okuma ağırlıklı veriler için: Users, Content)
  // Chat ve Logs sık değişir, cache'lemek riskli olabilir ama 5sn cache koyabiliriz.
  // Basitlik için sadece okuma yapıyoruz, cache'i şimdilik atlıyorum çünkü veri tutarlılığı daha önemli.
  // Google Sheet API zaten yeterince hızlı, darboğaz genellikle ağ bağlantısı.
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  return sheet.getDataRange().getValues();
}

function loginUser(username, password) {
  const data = getSheetData("Users");

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == password) {
      return response({
        status: "success",
        user: {
          username: data[i][0],
          room_id: data[i][2],
          city: data[i][5] || "" // City column is index 5
        }
      });
    }
  }
  return response({status: "error", message: "Kullanıcı adı veya şifre yanlış."});
}

function registerUser(username, password, onesignal_id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      return response({status: "error", message: "Bu kullanıcı adı zaten alınmış."});
    }
  }

  // Username, Password, RoomID, OneSignalID, Date, City
  sheet.appendRow([username, password, "", onesignal_id, new Date(), ""]);
  return response({status: "success", message: "Kayıt başarılı! Giriş yapabilirsiniz."});
}

function updateCity(username, city) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      sheet.getRange(i + 1, 6).setValue(city); // 6. sütun City
      return response({status: "success"});
    }
  }
  return response({status: "error", message: "User not found"});
}

function joinRoom(username, room_id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();

  let userFound = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
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

  const usersData = getSheetData("Users");
  let members = [];
  let memberCities = {};

  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][2] == room_id) {
      members.push(usersData[i][0]);
      memberCities[usersData[i][0]] = usersData[i][5] || ""; // City info
    }
  }

  const logsData = getSheetData("Logs");
  const today = new Date().toISOString().split('T')[0];

  let logs = {};
  for (let i = 1; i < logsData.length; i++) {
    let rowDate = new Date(logsData[i][3]).toISOString().split('T')[0];
    if (logsData[i][0] == room_id && rowDate == today) {
       let u = logsData[i][1];
       let p = logsData[i][2];
       if (!logs[u]) logs[u] = {};
       logs[u][p] = true;
    }
  }

  const chatData = getSheetData("Chat");
  let messages = [];
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
      memberCities: memberCities,
      logs: logs,
      messages: messages
    }
  });
}

function getContent() {
  // Content çok değişmez, Cache kullanabiliriz (1 Saat)
  const cache = CacheService.getScriptCache();
  const cachedContent = cache.get("content_data");
  if (cachedContent) {
    return ContentService.createTextOutput(cachedContent).setMimeType(ContentService.MimeType.JSON);
  }

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

  const jsonResponse = JSON.stringify({status: "success", content: content});
  cache.put("content_data", jsonResponse, 3600); // 1 saat cache

  return ContentService.createTextOutput(jsonResponse).setMimeType(ContentService.MimeType.JSON);
}

function logPrayer(username, room_id, prayer_name, is_checked) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Logs");
  if (is_checked) {
    sheet.appendRow([room_id, username, prayer_name, new Date(), new Date().toLocaleTimeString()]);
    sendNotificationToRoom(room_id, username, `${username} ${prayer_name} namazını kıldı! 🤲`);
  }
  return response({status: "success"});
}

function sendMessage(username, room_id, message) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Chat");
  sheet.appendRow([room_id, username, message, new Date()]);
  sendNotificationToRoom(room_id, username, `${username}: ${message}`);
  return response({status: "success"});
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationToRoom(room_id, sender_username, message_text) {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes("BURAYA")) return;

  const usersData = getSheetData("Users");
  let playerIds = [];

  for (let i = 1; i < usersData.length; i++) {
    // Aynı odada ama gönderen kişi değilse
    if (usersData[i][2] == room_id && usersData[i][0] != sender_username) {
      let pid = usersData[i][3]; // onesignal_id
      if (pid) playerIds.push(pid);
    }
  }

  if (playerIds.length === 0) return;

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
    headers: { "Authorization": "Basic " + ONESIGNAL_API_KEY },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Bildirim hatası: " + e.toString());
  }
}
