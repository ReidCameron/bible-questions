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

//Serverless Function
const handler = serverless(app);
module.exports.handler = async (event, context) => {
    connectLambda(event);

    //Routers
    app.use('/', (req, res, next)=>{
        req.event = event;
        next();
    });
    app.use('/api', require('./routers/apiRouter'));
    app.use('/', require('./routers/mainRouter'));

    return await handler(event, context);
};

module.exports.app = app;//Used to run express app directly