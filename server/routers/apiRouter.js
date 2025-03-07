const express = require('express');
const router = express.Router();
const { connectLambda, getStore } = require("@netlify/blobs");
require('dotenv').config();
const gmailApi = require("../utils/gmailApi");

var event;
router.use('/', async (req, res, next) =>{
    event = req.event;
    next();
});

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

    //Connect Lambda
    // connectLambda(event);

    //Get Last History ID from blob
    console.time("Get Store")
    const gmailStore = getStore("gmail");
    console.timeEnd("Get Store")
    console.log("Getting previous history ID...")
    console.time("Get Previous History ID")
    const prevHistoryId = await gmailStore.get("historyId") || 5000;
    console.timeEnd("Get Previous History ID")
    console.log("Previous History ID:", prevHistoryId);

    //Call Gmail History API
    console.log("Getting history from GMAIL API...")
    console.time("Get Gmail History")
    const historyObj = await gmailApi.getHistory(prevHistoryId);
    console.timeEnd("Get Gmail History")

    //Extract message IDs
    if(!historyObj?.history?.length) { console.log("No new History"); return; }
    else console.log("New messages found. Extractind IDs")
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
    const questionId = await responsesStore.get("questionId") || 0;
    console.timeEnd("Get Question ID")
    console.time("Get Responses")
    const responses = await responsesStore.get("responses-" + questionId, { type: 'json' }) || {};
    console.timeEnd("Get Responses")
    messages.forEach((msg) => {
        if(!responses[msg.id]){
            responses[msg.id] = {
                answer: msg.text,
                timestamp: msg.date,
                grade: null
            }
        }
    });
    console.time("Store Responses Object");
    responsesStore.setJSON("responses", responses);
    console.timeEnd("Store Responses Object");

    console.timeEnd("Message Update");
    console.log("----------Finish Message Update----------");
}

// function processMessageUpdate(message){
//     console.log("----------Start Message Update----------");
//     const { emailAddress, historyId } = message;
//     if(!emailAddress || ! historyId) { console.log("Message did not contain email or historyId"); return; }

//     //Get Last History ID from blob
//     const gmailStore = getStore("gmail");
//     console.log("Getting previous history ID...")
//     gmailStore.get("historyId")
//         .then((prevHistoryId)=>{
//             console.log("Previous History ID:", prevHistoryId)
//             getHistory(prevHistoryId);
//         })
//         .catch((e)=>{ console.log(e) })
// }

// function getHistory(prevHistoryId){
//     console.log("Getting history from GMAIL API...")
//     gmailApi.getHistory(prevHistoryId)
//         .then((ret)=>{
//             console.log("returned data");
//             if(ret?.data?.history?.length){
//                 //Extract message IDs
//                 console.log("Extracting Message IDs from History Object...");
//                 let messageIds = [];
//                 ret.data.history.forEach((obj)=>{
//                     const ids = obj.messagesAdded?.map( m => m.message.id );
//                     if(ids) messageIds.push(...ids);
//                 });
//                 console.log("Message IDs:", `[${messageIds.toString()}]`)
//             } else {
//                 console.log("No history Obj")
//             }
//         })
//         .catch((e)=>{console.log(e)})
// }
