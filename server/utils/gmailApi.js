// const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { wrapUnhandledPromise } = require('./functions')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
var auth;

// Reads previously authorized credentials from the save file.
async function loadSavedCredentialsIfExist() {
    try {
        // const content = await fs.readFile(TOKEN_PATH);
        const content = await process.env["GMAIL_API_TOKEN"];
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) { }
}

//Serializes credentials to a file compatible with GoogleAuth.fromJSON.
async function saveCredentials(client) {
    //  const content = await fs.readFile(CREDENTIALS_PATH);
    const content = process.env["GMAIL_API_CREDENTIALS"];
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await require('fs').promises.writeFile(TOKEN_PATH, payload);
}

//Load or request or authorization to call APIs.
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) { return client; }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (process.env["MODE"] === 'dev' && client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

async function getMessage(id) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.get({ userId: 'me', id });
    const data = res.data.payload.body.data;
    // if(!data) console.log(res.data.payload);
    const text = data ? Buffer.from(data, 'base64').toString('ascii').trim() : 'no data';
    
    const sender = res.data.payload.headers.filter(h => h.name === 'From')[0]?.value;
    const date = res.data.payload.headers.filter(h => h.name === 'Date')[0]?.value;
    return { sender, date, text }
}

async function getMessages(messageIds) {
    const _messageIds = (messageIds instanceof String) ? [messageIds] : messageIds;
    if (!(_messageIds instanceof Array) || _messageIds.length < 1) return;

    var messages = [];
    for (let i = 0; i < _messageIds.length; i++) {
        var message = await getMessage(_messageIds[i]);
        messages.push(message);
    }

    let textMessages = [];
    const pattern = /\d{10,11}@.*/;
    for (let i = 0; i < messages.length; i++){
        const msg = messages[i];
        if(pattern.test(msg.sender)){
            msg.id = msg.sender.split('@')[0];
            textMessages.push(msg);
        }
    }

    return textMessages;
}

async function getHistory(id) {
    console.timeLog("Msg Update");
    console.log("Called getHistory with id:", id)
    console.log("Create API ref...")
    console.timeLog("Msg Update");
    const gmail = google.gmail({ version: 'v1', auth });
    console.timeLog("Msg Update");
    console.log("Ref created");
    console.log("Get History...")
    console.timeLog("Msg Update");
    // const res = await gmail.users.history.list({
    //     userId: 'me',
    //     startHistoryId: id
    // });
    const res = await wrapUnhandledPromise(()=>{
        return gmail.users.history.list({
            userId: 'me',
            startHistoryId: id
        });
    }, {waitTime: 5000, default: {data: {}}});
    console.timeLog("Msg Update");
    console.log("History Retrieved.");
    const data = res.data;
    console.timeLog("Msg Update");
    console.log("return data")
    return data;
}

//Save Auth Client
authorize().then((client) => {
    auth = client;
});

module.exports = { getHistory, getMessages }
