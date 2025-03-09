const express = require('express');
const router = express.Router();
const { getStore, listStores } = require("@netlify/blobs");
require('dotenv').config();
const gmailApi = require("../utils/gmailApi");

//Routes
router.get('/', async (req, res, next) =>{
    res.json({'message': "Hey, how'd you get here?"});
});

router.get('/blob/listStores', async (req, res, next) =>{
    const { stores } = await listStores();
    res.status(200).json(JSON.stringify(stores));
})

router.get('/blob/list', async (req, res, next) =>{
    const storeParam = req.query.store;
    if(!storeParam) res.status(400).send("Missing store query");

    const store = getStore(storeParam);
    const list = await store.list();
    res.status(200).json(JSON.stringify(list));
})

router.post('/blob', async (req, res, next) =>{
    if(req.query.method === 'set'){
        const fields = JSON.parse(req.body.toString());
        const store = getStore(fields.store);
        await store.set(fields.key, fields.value);
        res.status(200).json(JSON.stringify(store));
    } else if (req.query.method === 'get'){
        const fields = JSON.parse(req.body.toString());
        const store = getStore(fields.store);
        const value = await store.get(fields.key);
        res.status(200).send(value);
    } else {
        res.status(400).send("Unsupported or missing method");
    }
});

router.post('/message', async (req, res, next) => {
    const body = req.body.toString();
    let body_json;
    try {
        body_json = JSON.parse(body);
    } catch (error) {
        res.status(400).send("Expected JSON data in body.");
    }

    const messageData = body_json?.message?.data;
    if(messageData){
        let messageData_json;
        try {
            messageData_json = JSON.parse(atob(messageData));
        } catch (error) {
            console.log(error);
            res.sendStatus(500); //TODO: IDK bout this
        }
        if(messageData_json){
            await processMessageUpdate(messageData_json, req.event)
            res.sendStatus(200); //For gmail event publisher
        } 
    }
});

//404 - Endpoint does not exist
router.use((req, res) => {
    res.status(404).json({'message': 'Endpoint does not exist.'});
});

//Exports
module.exports = router;
async function processMessageUpdate(message, event){
    console.log("----------Start Message Update----------");
    console.time("Message Update")
    const { emailAddress, historyId } = message;
    if(!emailAddress || ! historyId) { console.log("Message did not contain email or historyId"); return; }

    //Get Last History ID from blob
    console.time("Get Store")
    const gmailStore = getStore("gmail");
    console.timeEnd("Get Store")
    console.time("Get Previous History ID")
    const prevHistoryId = 5200//await gmailStore.get("historyId") || 5000;
    console.timeEnd("Get Previous History ID")
    console.log("Previous History ID:", prevHistoryId);

    //Call Gmail History API
    console.log("Getting history from GMAIL API...")
    console.time("Get Gmail History")
    const historyObj = await gmailApi.getHistory(prevHistoryId);
    console.timeEnd("Get Gmail History")

    //Extract message IDs
    if(!historyObj?.history?.length) { console.log("No new History"); return; }
    else console.log("New messages found. Extracting IDs...")
    console.time("Get Message Ids");
    let messageIds = [];
    historyObj?.history?.forEach((obj)=>{
        const ids = obj.messagesAdded?.map( m => m.message.id );
        if(ids) messageIds.push(...ids);
    });
    console.timeEnd("Get Message Ids");
    console.log("Message IDs:", `[${messageIds.toString()}]`)

    //Save new historyID to blob
    console.time("Set History ID");
    await gmailStore.set("historyId", historyId);
    console.timeEnd("Set History ID");

    //Get Messages
    console.log("Getting Messages Content from GMail API...");
    console.time("Get Messages Content");
    const messages = await gmailApi.getMessages(messageIds);
    console.timeEnd("Get Messages Content");
    console.log("Retrived messages:", JSON.stringify(messages));

    //Save messages to store
    if(!messages) {console.log("Received no new responses."); return;}
    console.log("Getting Response Store ref, questiond ID, and responses object...")
    const responsesStore = getStore("responses");
    console.time("Get Question ID")
    const questionId = await responsesStore.get("questionId") ?? '0';
    console.log({questionId})
    console.timeEnd("Get Question ID")
    console.time("Get Responses")
    const responses = await responsesStore.get('responses-' + questionId, { type: 'json' }) || {};
    console.log({responsesStore})
    console.timeEnd("Get Responses")
    messages.forEach((msg) => {
        responses[msg.id] = {
            answer: msg.text,
            timestamp: msg.date,
            grade: null,
            notes: null,
        }
    });
    console.time("Store Responses Object");
    responsesStore.setJSON('responses-' + questionId, responses);
    console.timeEnd("Store Responses Object");

    console.timeEnd("Message Update");
    console.log("----------Finish Message Update----------");
}
