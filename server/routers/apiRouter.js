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

function processMessageUpdate(message){
    console.log("----------Start Message Update----------");
    const { emailAddress, historyId } = message;
    if(!emailAddress || ! historyId) { console.log("Message did not contain email or historyId"); return; }

    //Get Last History ID from blob
    const gmailStore = getStore("gmail");
    gmailStore.get("historyId")
        .then((prevHistoryId)=>{
            getHistory(prevHistoryId);
        })
        .catch((e)=>{ console.log(e) })
}

function getHistory(prevHistoryId){
    gmailApi.getHistory(prevHistoryId)
        .then((ret)=>{
            if(ret?.data?.history?.length){
                //Extract message IDs
                console.log("Extracting Message IDs from History Object...");
                let messageIds = [];
                ret.data.history.forEach((obj)=>{
                    const ids = obj.messagesAdded?.map( m => m.message.id );
                    if(ids) messageIds.push(...ids);
                });
                console.log("Message IDs:", `[${messageIds.toString()}]`)
            }
        })
        .catch((e)=>{console.log(e)})
}
