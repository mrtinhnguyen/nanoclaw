
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

const execAsync = promisify(exec);

// Initialize OpenAI
// Note: Requires OPENAI_API_KEY environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy', // Prevent crash if missing, but will fail at runtime
});

/**
 * Transcribe audio file using OpenAI Whisper
 * @param filePath Path to the audio file
 * @returns Transcribed text
 */
export async function transcribeAudio(filePath: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY is not set. Cannot transcribe audio.');
    return null;
  }

  try {
    logger.info({ filePath }, 'Transcribing audio...');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Convert OGG (WhatsApp default) to MP3 if needed
    // WhatsApp often sends OGG Opus which Whisper accepts, but sometimes conversion helps compatibility
    // For now, try sending directly.
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'vi', // Optimize for Vietnamese
    });

    logger.info({ text: transcription.text }, 'Transcription successful');
    return transcription.text;
  } catch (err) {
    logger.error({ err }, 'Failed to transcribe audio');
    return null;
  }
}

/**
 * Convert audio using ffmpeg (if needed)
 */
export async function convertToMp3(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(path.extname(inputPath), '.mp3');
  try {
    await execAsync(`ffmpeg -i "${inputPath}" "${outputPath}"`);
    return outputPath;
  } catch (err) {
    logger.error({ err }, 'FFmpeg conversion failed');
    throw err;
  }
}
