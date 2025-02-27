const express = require('express');
const router = express.Router();
const { getStore } = require("@netlify/blobs");
require('dotenv').config();
const gmailApi = require("../utils/gmailApi");
const { wrapUnhandledPromise } = require('../utils/functions')

//Routes
router.get('/', async (req, res, next) =>{
    res.json({'message': "Hey, how'd you get here?"});
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
            res.sendStatus(200); //For gmail event publisher
            processMessageUpdate(messageData_json)
        } 
    }
});

//404 - Endpoint does not exist
router.use((req, res) => {
    res.status(404).json({'message': 'Endpoint does not exist.'});
});

//Exports
module.exports = router;

async function processMessageUpdate(message){
    console.log("----------Start Message Update----------")
    const { emailAddress, historyId } = message;
    if(!emailAddress || ! historyId) { console.log("Message did not contain email or historyId"); return; }
    
    //Get Last History ID from blob
    console.log("Getting Gmail store reference and Previous History ID...");
    const gmailStore = getStore("gmail");
    console.log("Received Store", JSON.stringify(gmailStore));
    var prevHistoryId;
    console.log("Getting History ID from gmailStore...");
    prevHistoryId = (await wrapUnhandledPromise(()=>{
        return gmailStore.get("historyId");
    }), {default : `${+historyId - 500}`});
    console.log("Retrieved Previous History ID:", prevHistoryId)

    //Call Gmail History API
    console.log("Getting History Object from GMail API...");
    const historyObj = await gmailApi.getHistory(prevHistoryId);
    if(!historyObj) { console.log("No History Object found."); return; }
    console.log("History Object Found:", JSON.stringify(historyObj));

    //Extract message IDs
    console.log("Extracting Message IDs from History Object...");
    let messageIds = [];
    historyObj.history?.forEach((obj)=>{
        const ids = obj.messagesAdded?.map( m => m.message.id );
        if(ids) messageIds.push(...ids);
    });
    console.log("Message IDs:", `[${messageIds.toString()}]`)

    //Save new historyID to blob
    console.log("Setting History ID...");
    await gmailStore.set("historyId", historyId);
    console.log("History ID Set");

    //Get Messages
    if(!messageIds.length) return;
    console.log("Getting Messages from GMail API...")
    const messages = await gmailApi.getMessages(messageIds);
    console.log("Retrived messages:", JSON.stringify(messages))

    //Save messages to store
    if(!messages) {console.log("Received no new responses."); return;}
    console.log("Getting Response Store ref, questiond ID, and responses object...")
    const responsesStore = getStore("responses");
    const questionId = (await wrapUnhandledPromise(()=>{
        return responsesStore.get("questionId")
    }), { default: 0 });
    const responses = (await wrapUnhandledPromise(()=>{
        return responsesStore.get("responses-" + questionId, { type: 'json' });
    }), { default: {} });
    console.log("Retrieved data. Updating responses object");
    messages.forEach((msg) => {
        if(!responses[msg.id]){
            responses[msg.id] = {
                answer: msg.text,
                timestamp: msg.date,
                grade: null
            }
        }
    });
    console.log("Store responses object...");
    responsesStore.setJSON("responses", responses);
    console.log("Responses Object Stored");

    console.log("----------Finish Message Update----------");
}
