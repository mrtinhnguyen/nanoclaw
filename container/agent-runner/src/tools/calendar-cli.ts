
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(os.homedir(), '.calendar-mcp', 'token.json');
const CREDENTIALS_PATH = path.join(os.homedir(), '.calendar-mcp', 'credentials.json');

// Ensure directory exists
const configDir = path.dirname(TOKEN_PATH);
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

async function loadSavedCredentialsIfExist() {
    try {
        const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client: any) {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    
    // If no token, we need to authenticate (CLI flow)
    // In a container, this is hard. We'll fail and ask user to provide token.
    console.error(`Error: No token found at ${TOKEN_PATH}. Please mount a valid token.json.`);
    process.exit(1);
}

async function listEvents(argv: any) {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: argv.count,
        singleEvents: true,
        orderBy: 'startTime',
    });
    const events = res.data.items;
    if (!events || events.length === 0) {
        console.log('No upcoming events found.');
        return;
    }
    console.log('Upcoming events:');
    events.forEach((event: any) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
    });
}

async function addEvent(argv: any) {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    
    const startTime = new Date(argv.start);
    const endTime = new Date(startTime.getTime() + argv.duration * 60000);

    const event = {
        summary: argv.summary,
        description: argv.description,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
    };

    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });
        console.log(`Event created: ${res.data.htmlLink}`);
    } catch (err) {
        console.error('There was an error contacting the Calendar service: ' + err);
    }
}

yargs(hideBin(process.argv))
    .command('list [count]', 'List upcoming events', (yargs) => {
        return yargs.positional('count', {
            describe: 'Number of events to list',
            default: 10
        });
    }, listEvents)
    .command('add', 'Add an event', (yargs) => {
        return yargs
            .option('summary', { type: 'string', demandOption: true })
            .option('start', { type: 'string', demandOption: true, describe: 'ISO date string' })
            .option('duration', { type: 'number', default: 60, describe: 'Duration in minutes' })
            .option('description', { type: 'string' });
    }, addEvent)
    .parse();
