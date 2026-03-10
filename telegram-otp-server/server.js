/**
 * Kurulum:
 *   npm init -y
 *   npm install express cors dotenv node-telegram-bot-api
 *
 * Çalıştırma:
 *   node server.js
 *
 * Gerekli .env değişkenleri:
 *   TELEGRAM_BOT_TOKEN=xxxxxxxxxx:yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
 *   FRONTEND_URL=https://turkishmock.uz
 *   PORT=3000
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://turkishmock.uz";
const DEFAULT_PUBLIC_LOGIN_URL = "https://turkishmock.uz";
const MAIN_API_URL = (process.env.MAIN_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const TELEGRAM_AUTH_PASSWORD = process.env.TELEGRAM_AUTH_PASSWORD || "ChangeMe-Telegram-Auth-Password";
const TELEGRAM_DEFAULT_ACCOUNT_TYPE = process.env.TELEGRAM_DEFAULT_ACCOUNT_TYPE || "STUDENT";
const TELEGRAM_ENABLE_BACKEND_AUTH = String(
  process.env.TELEGRAM_ENABLE_BACKEND_AUTH || "true"
).toLowerCase() !== "false";

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN .env içinde tanımlı değil.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// OTP verileri bellek içi tutulur.
// code -> { code, phoneNumber, firstName, lastName, telegramId, expiresAt }
const otpByCode = new Map();
// telegramId -> code (Renew sırasında eski kodu iptal etmek için)
const codeByTelegramId = new Map();

const OTP_TTL_MS = 3 * 60 * 1000; // 3 dakika

function getTelegramSafeLoginUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl || DEFAULT_PUBLIC_LOGIN_URL);
    const host = parsed.hostname.toLowerCase();
    const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
    const allowedProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const blocked = blockedHosts.has(host) || host.endsWith(".local");
    if (!allowedProtocol || blocked) return DEFAULT_PUBLIC_LOGIN_URL;
    return parsed.toString();
  } catch {
    return DEFAULT_PUBLIC_LOGIN_URL;
  }
}

const TELEGRAM_LOGIN_URL = getTelegramSafeLoginUrl(FRONTEND_URL);

function extractTokens(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested = root.data && typeof root.data === "object" ? root.data : {};
  const accessToken =
    root.accessToken ||
    root.access_token ||
    root.token ||
    nested.accessToken ||
    nested.access_token ||
    nested.token;
  const refreshToken =
    root.refreshToken ||
    root.refresh_token ||
    nested.refreshToken ||
    nested.refresh_token;
  return {
    accessToken: accessToken ? String(accessToken) : "",
    refreshToken: refreshToken ? String(refreshToken) : "",
  };
}

function normalizePhoneNumber(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("998")) return digits;
  return `998${digits}`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  return { ok: response.ok, status: response.status, data };
}

function getApiErrorMessage(payload, fallback) {
  const root = payload && typeof payload === "object" ? payload : {};
  return (
    root.message ||
    root.error ||
    root.data?.message ||
    root.data?.error ||
    fallback
  );
}

async function resolveBackendAuthForTelegramUser(payload) {
  const telegramId = String(payload.telegramId || "");
  if (!telegramId) {
    throw new Error("Telegram ID bulunamadi.");
  }

  const userName = `tg_${telegramId}`;
  const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
  const displayName =
    `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || `Telegram ${telegramId}`;

  const loginCandidates = [
    { name: userName, password: TELEGRAM_AUTH_PASSWORD },
    { userName, password: TELEGRAM_AUTH_PASSWORD },
  ];

  for (const loginPayload of loginCandidates) {
    const loginResp = await postJson(`${MAIN_API_URL}/api/user/login`, loginPayload);
    const loginTokens = extractTokens(loginResp.data);
    if (loginResp.ok && loginTokens.accessToken) {
      return loginTokens;
    }
  }

  const registerPayload = {
    name: displayName,
    userName,
    password: TELEGRAM_AUTH_PASSWORD,
    phoneNumber: normalizedPhone || undefined,
    accountType: TELEGRAM_DEFAULT_ACCOUNT_TYPE,
  };

  const registerResp = await postJson(`${MAIN_API_URL}/api/user/register`, registerPayload);
  if (!registerResp.ok) {
    const registerError = getApiErrorMessage(
      registerResp.data,
      "Telegram kullanicisi backend'e kaydedilemedi."
    );
    throw new Error(registerError);
  }

  const loginAfterRegister = await postJson(`${MAIN_API_URL}/api/user/login`, {
    name: userName,
    password: TELEGRAM_AUTH_PASSWORD,
  });
  const tokensAfterRegister = extractTokens(loginAfterRegister.data);
  if (loginAfterRegister.ok && tokensAfterRegister.accessToken) {
    return tokensAfterRegister;
  }

  throw new Error("Telegram kullanicisi icin backend token olusturulamadi.");
}

function otpInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🌐 Giriş", url: TELEGRAM_LOGIN_URL }],
      [{ text: "🔄 Yenile", callback_data: "renew_otp" }],
    ],
  };
}

async function sendOtpMessage(chatId, code) {
  try {
    await bot.sendMessage(chatId, `🔒 Kod: ${code}`, {
      reply_markup: otpInlineKeyboard(),
    });
  } catch (error) {
    // Fallback: if Telegram rejects URL button, still deliver code + renew button.
    console.error("OTP message send failed, using fallback:", error?.message || error);
    await bot.sendMessage(chatId, `🔒 Kod: ${code}\n🌐 Giriş: ${TELEGRAM_LOGIN_URL}`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔄 Yenile", callback_data: "renew_otp" }]],
      },
    });
  }
}

function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [code, payload] of otpByCode.entries()) {
    if (!payload || payload.expiresAt <= now) {
      otpByCode.delete(code);
      if (payload && payload.telegramId) {
        const currentCode = codeByTelegramId.get(payload.telegramId);
        if (currentCode === code) {
          codeByTelegramId.delete(payload.telegramId);
        }
      }
    }
  }
}

function generateUniqueOtp() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (otpByCode.has(code));
  return code;
}

function saveOtp({ phoneNumber, firstName, lastName, telegramId }) {
  const previousCode = codeByTelegramId.get(telegramId);
  if (previousCode) {
    otpByCode.delete(previousCode);
  }

  const code = generateUniqueOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;

  otpByCode.set(code, {
    code,
    phoneNumber,
    firstName,
    lastName,
    telegramId,
    expiresAt,
  });
  codeByTelegramId.set(telegramId, code);

  return code;
}

setInterval(cleanupExpiredOtps, 60 * 1000);

bot.on("polling_error", (error) => {
  console.error("Telegram polling error:", error?.message || error);
  if (error?.response?.body) {
    console.error("Telegram polling error body:", error.response.body);
  }
  if (error?.stack) {
    console.error(error.stack);
  }
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`[TG] /start received chatId=${chatId} from=${msg.from?.username || msg.from?.id || "unknown"}`);

  try {
    await bot.sendMessage(
      chatId,
      "Merhaba 👋\nTurkishMock doğrulama botuna hoş geldiniz.\nDevam etmek için telefon numaranızı paylaşın.",
      {
      reply_markup: {
        keyboard: [
          [
            {
              text: "📱 Telefon Numaramı Paylaş",
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
    );
  } catch (error) {
    console.error("/start mesajı gönderilemedi:", error.message);
  }
});

bot.on("contact", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const contact = msg.contact;
    console.log(
      `[TG] contact event chatId=${chatId} from=${msg.from?.username || msg.from?.id || "unknown"} hasContact=${!!contact}`,
    );

    if (!contact) return;

    // Güvenlik: kullanıcı kendi telefonunu paylaşmalı.
    if (contact.user_id && msg.from && contact.user_id !== msg.from.id) {
      await bot.sendMessage(chatId, "Lütfen kendi telefon numaranızı paylaşın.");
      return;
    }

    const telegramId = msg.from ? msg.from.id : contact.user_id;
    if (!telegramId) {
      await bot.sendMessage(chatId, "Telegram kimliği alınamadı. Lütfen tekrar deneyin.");
      return;
    }

    const code = saveOtp({
      phoneNumber: contact.phone_number || "",
      firstName: contact.first_name || msg.from?.first_name || "",
      lastName: contact.last_name || msg.from?.last_name || "",
      telegramId,
    });
    console.log(
      `[TG] otp generated telegramId=${telegramId} phone=${contact.phone_number || "unknown"} code=${code} loginUrl=${TELEGRAM_LOGIN_URL}`,
    );

    await sendOtpMessage(chatId, code);
  } catch (error) {
    console.error("Contact handler failed:", error?.message || error);
  }
});

bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message?.chat?.id;
  const telegramId = query.from?.id;

  if (!chatId || !telegramId) {
    if (query.id) {
      await bot.answerCallbackQuery(query.id, { text: "İşlem başarısız." });
    }
    return;
  }

  if (data !== "renew_otp") {
    if (query.id) {
      await bot.answerCallbackQuery(query.id, { text: "Bilinmeyen işlem." });
    }
    return;
  }

  const existingCode = codeByTelegramId.get(telegramId);
  const existingPayload = existingCode ? otpByCode.get(existingCode) : null;

  if (!existingPayload) {
    await bot.answerCallbackQuery(query.id, {
      text: "Aktif kod bulunamadı. /start ile tekrar başlayın.",
      show_alert: true,
    });
    return;
  }

  const newCode = saveOtp({
    phoneNumber: existingPayload.phoneNumber,
    firstName: existingPayload.firstName,
    lastName: existingPayload.lastName,
    telegramId,
  });
  console.log(`[TG] otp renewed telegramId=${telegramId} code=${newCode}`);

  await bot.answerCallbackQuery(query.id, { text: "Yeni kod üretildi." });

  await sendOtpMessage(chatId, newCode);
});

app.post("/api/verify-telegram", async (req, res) => {
  cleanupExpiredOtps();

  const otpCode = String(req.body?.otpCode || "").trim();
  console.log(`[API] verify-telegram called otp=${otpCode || "empty"}`);
  if (!/^\d{6}$/.test(otpCode)) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz OTP formatı. 6 haneli kod gönderin.",
    });
  }

  const payload = otpByCode.get(otpCode);
  if (!payload || payload.expiresAt <= Date.now()) {
    console.log(`[API] verify-telegram failed otp=${otpCode} reason=not_found_or_expired`);
    if (payload) {
      otpByCode.delete(otpCode);
      const activeCode = codeByTelegramId.get(payload.telegramId);
      if (activeCode === otpCode) {
        codeByTelegramId.delete(payload.telegramId);
      }
    }

    return res.status(400).json({
      success: false,
      message: "OTP kodu geçersiz veya süresi dolmuş.",
    });
  }

  let backendTokens = { accessToken: "", refreshToken: "" };
  if (TELEGRAM_ENABLE_BACKEND_AUTH) {
    try {
      backendTokens = await resolveBackendAuthForTelegramUser(payload);
      if (!backendTokens.accessToken) {
        return res.status(500).json({
          success: false,
          message: "Telegram dogrulandi ama backend token olusturulamadi.",
        });
      }
    } catch (error) {
      console.error("[API] backend auth failed:", error?.message || error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Backend oturum acma hatasi.",
      });
    }
  }

  // Tek kullanımlık: doğrulandıktan sonra kod silinir.
  otpByCode.delete(otpCode);
  const activeCode = codeByTelegramId.get(payload.telegramId);
  if (activeCode === otpCode) {
    codeByTelegramId.delete(payload.telegramId);
  }

  console.log(
    `[API] verify-telegram success otp=${otpCode} telegramId=${payload.telegramId} phone=${payload.phoneNumber}`,
  );

  return res.status(200).json({
    success: true,
    accessToken: backendTokens.accessToken || undefined,
    refreshToken: backendTokens.refreshToken || undefined,
    user: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      telegramId: payload.telegramId,
    },
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Telegram OTP servisi çalışıyor" });
});

app.listen(PORT, () => {
  console.log(`Telegram OTP backend running on http://localhost:${PORT}`);
  console.log(`Telegram login URL: ${TELEGRAM_LOGIN_URL}`);
  console.log(`Backend auth enabled: ${TELEGRAM_ENABLE_BACKEND_AUTH} (MAIN_API_URL=${MAIN_API_URL})`);
});

async function initTelegramPolling() {
  try {
    // If webhook is set somewhere else, polling won't work reliably.
    await bot.deleteWebHook({ drop_pending_updates: true });
    await bot.startPolling({ restart: true });
    console.log("Telegram bot polling started");
  } catch (error) {
    console.error("Telegram bot polling start failed:", error?.message || error);
    if (error?.response?.body) {
      console.error("Telegram startPolling error body:", error.response.body);
    }
    if (error?.stack) {
      console.error(error.stack);
    }
    if (error?.errors) {
      console.error("Nested errors:", error.errors);
    }
  }
}

initTelegramPolling();
