const express = require('express');
const router = express.Router();
const { getStore } = require("@netlify/blobs");
require('dotenv').config();
const gmailApi = require("../utils/gmailApi");

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
    const { emailAddress, historyId } = message;
    if(!emailAddress || ! historyId) return;

    //Get Last History ID from blob
    const gmailStore = getStore("gmail");
    const prevHistoryId = await gmailStore.get("historyId") || "1757";

    //Call Gmail History API
    const historyObj = await gmailApi.getHistory(prevHistoryId);
    if(!historyObj) return;
    // console.dir(historyObj, {depth: null})

    //Extract message IDs
    let messageIds = [];
    historyObj.history?.forEach((obj)=>{
        const ids = obj.messagesAdded?.map( m => m.message.id );
        if(ids) messageIds.push(...ids);
    });

    //Save new historyID to blob
    await gmailStore.set("historyId", historyId);

    //Get Messages
    if(!messageIds.length) return;
    const messages = await gmailApi.getMessages(messageIds);

    //Save messages to store
    const responsesStore = getStore("responses");
    const questionId = await responsesStore.get("questionId") || 0;
    const responses = await responsesStore.get("responses-" + questionId, { type: 'json' });
    messages.forEach((msg) => {
        if(!responses[msg.id]){
            responses[msg.id] = {
                answer: msg.text,
                timestamp: msg.date,
                grade: null
            }
        }
    });
    responsesStore.setJSON("responses", responses);
}