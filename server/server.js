/* Imports */
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const { connectLambda, getStore } = require("@netlify/blobs");

// Express Config
app.engine('ejs', require('ejs').__express);
app.set('view engine', 'ejs');
app.set('views', process.cwd() + '/src/views');
app.use(express.static('src'));

//Routers
app.use('/api', require('./routers/apiRouter'));
app.use('/', require('./routers/mainRouter'));

//Serverless Function
const handler = serverless(app);
module.exports.handler = async (event, context) => {
    connectLambda(event);
    
    console.log("Get Gmail store reference...");
    console.time("Get Store")
    const gmailStore = getStore("gmail");
    console.timeEnd("Get Store")
    console.log("Received Store", JSON.stringify(gmailStore));
    console.log("Getting previous history ID...")
    console.time("Get History ID")
    const prevHistoryId = await gmailStore.get("historyId") || '3500';
    console.timeEnd("Get History ID")
    console.log("Previous History ID:", prevHistoryId);
    return await handler(event, context);
};

module.exports.app = app;//Used to run express app directly