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
            await processMessageUpdate(messageData_json)
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
    console.log("----------Start Message Update----------");
    const { emailAddress, historyId } = message;
    if(!emailAddress || ! historyId) { console.log("Message did not contain email or historyId"); return; }

    //Get Last History ID from blob
    const gmailStore = getStore("gmail");
    console.log("Getting previous history ID...")
    const prevHistoryId = await gmailStore.get("historyId") || '3500';
    console.log("Previous History ID:", prevHistoryId);

    //Get History from Gmail API
    console.log("Getting history from GMAIL API...")
    const ret = await gmailApi.getHistory(prevHistoryId);
    console.log("Returned Data:", {data: ret?.data});
    if(ret?.data?.history?.length){
        //Extract message IDs
        console.log("Extracting Message IDs from History Object...");
        let messageIds = [];
        ret.data.history.forEach((obj)=>{
            const ids = obj.messagesAdded?.map( m => m.message.id );
            if(ids) messageIds.push(...ids);
        });
        console.log("Message IDs:", `[${messageIds.toString()}]`)
    } else {
        console.log("No history Obj")
    }
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
