// ClimaLens — Telegram Admin Bot Service
import { Platform } from 'react-native';

const BOT_TOKEN = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

export const AdminBotService = {
  /**
   * Send a raw message to the Telegram bot
   */
  async sendMessage(text: string) {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn('Telegram Admin Bot: Missing token or chat ID.');
      return;
    }

    try {
      await fetch(TELEGRAM_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
    } catch (e) {
      console.error('Failed to send Telegram message:', e);
    }
  },

  /**
   * Ping Admin about a new user sign up
   */
  async sendSignupAlert(email: string, name?: string) {
    const text = `
🟢 <b>New User Sign-Up!</b>
<b>Name:</b> ${name || 'Unknown'}
<b>Email:</b> ${email}
<b>OS:</b> ${Platform.OS}
<b>Time:</b> ${new Date().toLocaleString()}
    `.trim();

    await this.sendMessage(text);
  },

  /**
   * Ping Admin about an app crash or critical error
   */
  async sendCrashAlert(error: string, isFatal: boolean = false) {
    const text = `
${isFatal ? '🔴' : '🟠'} <b>APP CRASH DETECTED</b>
<b>Fatal:</b> ${isFatal}
<b>OS:</b> ${Platform.OS}
<b>Error:</b>
<pre>${error}</pre>
<b>Time:</b> ${new Date().toLocaleString()}
    `.trim();

    await this.sendMessage(text);
  },

  /**
   * Ping Admin when a user submits feedback or contacts support
   */
  async sendUserFeedback(email: string, message: string) {
    const text = `
💬 <b>New User Feedback!</b>
<b>User:</b> ${email || 'Anonymous'}
<b>Message:</b> 
<pre>${message}</pre>
<b>Time:</b> ${new Date().toLocaleString()}
    `.trim();

    await this.sendMessage(text);
  },

  /**
   * Ping Admin when a user plans a new trip
   */
  async sendTripPlannedAlert(email: string, destination: string, days: number, riskLevel: string) {
    const text = `
🗺️ <b>New Trip Planned!</b>
<b>User:</b> ${email || 'Anonymous'}
<b>Destination:</b> ${destination}
<b>Duration:</b> ${days} days
<b>Risk Level:</b> ${riskLevel}
<b>Time:</b> ${new Date().toLocaleString()}
    `.trim();

    await this.sendMessage(text);
  }
};
