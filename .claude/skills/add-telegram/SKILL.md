---
name: add-telegram
description: Add Telegram integration to NanoClaw. Allows the agent to communicate via Telegram Bot API alongside WhatsApp.
---

# Add Telegram Integration

This skill adds Telegram support to NanoClaw.

## Prerequisites

Ask the user:
> Please provide your Telegram Bot Token (from @BotFather).

## 1. Install Dependencies

```bash
npm install telegraf
```

## 2. Create Telegram Service

Create `src/telegram-service.ts`:

```typescript
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import pino from 'pino';
import { NewMessage } from './types.js';
import { transcribeAudio } from './transcribe.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

export type MessageCallback = (msg: NewMessage) => Promise<void>;

export class TelegramService {
  private bot: Telegraf;
  private onMessageCallback: MessageCallback | null = null;

  constructor(token: string) {
    this.bot = new Telegraf(token);
    this.setupListeners();
  }

  private setupListeners() {
    this.bot.on(message('text'), async (ctx) => {
      if (!this.onMessageCallback) return;
      
      const msg: NewMessage = {
        id: ctx.message.message_id.toString(),
        chat_jid: ctx.chat.id.toString(),
        sender: ctx.from.id.toString(),
        sender_name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
        content: ctx.message.text,
        timestamp: new Date(ctx.message.date * 1000).toISOString()
      };

      await this.onMessageCallback(msg);
    });

    // Handle Voice/Audio
    this.bot.on([message('voice'), message('audio')], async (ctx) => {
      if (!this.onMessageCallback) return;

      const fileId = (ctx.message as any).voice?.file_id || (ctx.message as any).audio?.file_id;
      if (!fileId) return;

      try {
        const link = await ctx.telegram.getFileLink(fileId);
        const tempFile = path.join(os.tmpdir(), `tg-${fileId}.ogg`);
        
        // Download
        await new Promise((resolve, reject) => {
          https.get(link.href, (res) => {
            const stream = fs.createWriteStream(tempFile);
            res.pipe(stream);
            stream.on('finish', resolve);
            stream.on('error', reject);
          });
        });

        const text = await transcribeAudio(tempFile);
        if (text) {
          const msg: NewMessage = {
            id: ctx.message.message_id.toString(),
            chat_jid: ctx.chat.id.toString(),
            sender: ctx.from.id.toString(),
            sender_name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
            content: `[Audio Transcription] ${text}`,
            timestamp: new Date(ctx.message.date * 1000).toISOString()
          };
          
          await this.onMessageCallback(msg);
        }
        
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

      } catch (err) {
        logger.error({ err }, 'Failed to process Telegram audio');
      }
    });
  }

  public setOnMessage(callback: MessageCallback) {
    this.onMessageCallback = callback;
  }

  public async sendMessage(chatId: string, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text);
    } catch (err) {
      logger.error({ chatId, err }, 'Failed to send Telegram message');
    }
  }

  public async sendTyping(chatId: string) {
    try {
      await this.bot.telegram.sendChatAction(chatId, 'typing');
    } catch (err) {
      // Ignore
    }
  }

  public launch() {
    this.bot.launch().then(() => {
      logger.info('Telegram Bot started');
    }).catch(err => {
      logger.error({ err }, 'Failed to launch Telegram Bot');
    });

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}
```

## 3. Update Config

Add `TELEGRAM_TOKEN` to `src/config.ts`.

## 4. Integrate into Main Loop (`src/index.ts`)

Modify `src/index.ts` to:
1. Initialize `TelegramService` if token is present.
2. Call `processMessage` when Telegram receives a message.
3. Update `sendMessage` to check if JID is a Telegram ID (numeric) or WhatsApp JID (`@g.us`).

```typescript
// In sendMessage function:
if (!jid.includes('@')) {
    // Assume Telegram
    await telegramService.sendMessage(jid, text);
} else {
    // WhatsApp
    await sock.sendMessage(jid, { text });
}
```
