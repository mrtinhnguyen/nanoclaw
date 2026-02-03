
import { Telegraf } from 'telegraf';
import pino from 'pino';
import { NewMessage } from './types.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

let bot: Telegraf | null = null;
let messageHandler: ((msg: NewMessage) => Promise<void>) | null = null;

export function isTelegramEnabled(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function startTelegramBot(
  onMessage: (msg: NewMessage) => Promise<void>
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.info('TELEGRAM_BOT_TOKEN not set, skipping Telegram bot startup');
    return;
  }

  try {
    bot = new Telegraf(token);
    messageHandler = onMessage;

    bot.on('text', async (ctx) => {
      try {
        const chat = ctx.chat;
        const user = ctx.from;
        const text = ctx.message.text;
        
        // Construct a unique JID for Telegram: chatId@tg
        // Telegram chat IDs are integers (negative for groups)
        const chatJid = `${chat.id}@tg`;
        
        const msg: NewMessage = {
          id: `tg-${ctx.message.message_id}`,
          chat_jid: chatJid,
          sender: `${user.id}@tg`,
          sender_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Unknown',
          content: text,
          timestamp: new Date(ctx.message.date * 1000).toISOString()
        };

        logger.info({ chatJid, sender: msg.sender_name }, 'Received Telegram message');
        
        if (messageHandler) {
          await messageHandler(msg);
        }
      } catch (err) {
        logger.error({ err }, 'Error handling Telegram message');
      }
    });

    // Handle errors
    bot.catch((err, ctx) => {
      logger.error({ err, updateType: ctx.updateType }, 'Telegram bot error');
    });

    // Start the bot (do not await launch as it blocks)
    bot.launch(() => {
        logger.info('Telegram bot started successfully');
    }).catch(err => {
        logger.error({ err }, 'Telegram bot launch failed');
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot?.stop('SIGINT'));
    process.once('SIGTERM', () => bot?.stop('SIGTERM'));

  } catch (err) {
    logger.error({ err }, 'Failed to start Telegram bot');
  }
}

export async function sendTelegramMessage(jid: string, text: string): Promise<void> {
  if (!bot) {
    logger.warn('Attempted to send Telegram message but bot is not initialized');
    return;
  }

  try {
    // Extract chat ID from JID (remove @tg suffix)
    const chatId = jid.replace('@tg', '');
    
    await bot.telegram.sendMessage(chatId, text);
    logger.info({ jid, length: text.length }, 'Telegram message sent');
  } catch (err) {
    logger.error({ jid, err }, 'Failed to send Telegram message');
    throw err;
  }
}
