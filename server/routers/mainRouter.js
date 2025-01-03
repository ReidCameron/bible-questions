const express = require('express');
const router = express.Router();

//Routes
router.get('/', async (req, res, next) =>{
    res.render('index');
});
router.get('/about', async (req, res, next) =>{
    res.render('about');
});
router.get('/string/:string', async (req, res, next) =>{
    res.render('index', {string: req.params.string});
});

//404 - Endpoint does not exist
router.use((req, res) => {
    res.status(404).render('404');
});

//Exports
module.exports = router;