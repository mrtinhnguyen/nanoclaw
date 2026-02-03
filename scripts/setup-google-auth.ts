
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Scopes cho cả Calendar và Gmail
// Nếu bạn chỉ cần Calendar hoặc Gmail, hãy bỏ bớt scope
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('=== Google API Authentication Helper ===');
  console.log('Script này giúp bạn tạo file token.json từ credentials.json');
  console.log('');

  const credentialsPath = await question('Nhập đường dẫn đến file credentials.json (mặc định: ./credentials.json): ');
  const finalCredPath = credentialsPath.trim() || './credentials.json';

  if (!fs.existsSync(finalCredPath)) {
    console.error(`Lỗi: Không tìm thấy file tại ${finalCredPath}`);
    rl.close();
    process.exit(1);
  }

  const content = fs.readFileSync(finalCredPath, 'utf-8');
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  if (!client_id || !client_secret) {
    console.error('Lỗi: File credentials.json không hợp lệ (thiếu client_id hoặc client_secret)');
    rl.close();
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force refresh token generation
  });

  console.log('\nAuthorize this app by visiting this url:');
  console.log('--------------------------------------------------');
  console.log(authUrl);
  console.log('--------------------------------------------------');
  console.log('');

  const code = await question('Nhập mã xác thực (code) từ trình duyệt: ');
  
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log('\nĐã lấy được token thành công!');
    
    const outputDir = './google-tokens';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const tokenPath = path.join(outputDir, 'token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    
    console.log(`\nĐã lưu token tại: ${tokenPath}`);
    console.log('Hãy copy file này và credentials.json lên server theo hướng dẫn.');
    
  } catch (err) {
    console.error('Lỗi khi lấy token:', err);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
