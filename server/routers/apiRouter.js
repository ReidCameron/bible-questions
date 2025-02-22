const express = require('express');
const router = express.Router();

//Routes
router.get('/', async (req, res, next) =>{
    res.json({'message': 'Welcome to the demo API.'});
});

router.post('/message', async (req, res, next) =>{
    console.log("[BQ] POST BODY:", req.body.toString())
    res.sendStatus(200);
});

//404 - Endpoint does not exist
router.use((req, res) => {
    res.status(404).json({'message': 'Endpoint does not exist.'});
});

//Exports
module.exports = router;