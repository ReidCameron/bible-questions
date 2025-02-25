const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
require('dotenv').config();
const { getStore } = require("@netlify/blobs");

const config = {
    SESSION_TOKEN: 'bq_session_token',
    USER_TOKEN: 'bq_user_token',
}

//Routes
router.get('/', async (req, res, next) =>{
    res.render('index');
});

router.get('/about', async (req, res, next) =>{
    res.render('about');
});

router.get('/admin', async (req, res, next) =>{
    const session_token = getCookie(req.headers.cookie, config.SESSION_TOKEN);
    const user_token = getCookie(req.headers.cookie, config.USER_TOKEN);
    if(session_token && user_token){
        await validateSession(user_token, session_token) ? res.redirect('/admin/dashboard') : res.render('admin', {timeout: true})
    } else {
        res.render('admin');
    }
});

router.post('/admin', async (req, res, next) =>{
    //Get Admin login form data
    const formData = {};
    req.body.toString().split('&').map(item => {
        const [key, value] = item.split('=').map(i => decodeURIComponent(i));
        formData[key] = value;
    });

    //Validate Admin credentials [no hashing since it's low security]
    if(process.env["ADMIN_USERNAME"] === formData.username && process.env["ADMIN_PASSWORD"] === formData.password){
        const token = uuid();
        await saveSession(formData.username, token)
        res
            .cookie(config.SESSION_TOKEN, token, {
                secure: true,
                httpOnly: true,
                maxAge: 2.592e+8                
            })
            .cookie(config.USER_TOKEN, formData.username, {
                secure: true,
                httpOnly: true                
            })
            .redirect('/admin/dashboard')
    } else {
        res.render('admin', {login: false});
    }
    
});

router.get('/admin/dashboard', async (req, res, next) =>{
    const session_token = getCookie(req.headers.cookie, config.SESSION_TOKEN);
    const user_token = getCookie(req.headers.cookie, config.USER_TOKEN);
    if(session_token && user_token){
        await validateSession(user_token, session_token) ? res.render('dashboard') : res.redirect('/admin')
    } else {
        res.redirect('/admin');
    }
});

//404 - Endpoint does not exist
router.use((req, res) => {
    res.status(404).render('404');
});

//Functions
async function validateSession(user, session_token){
    const userStore = getStore('userStore');
    const users = await userStore.get('users', {type: 'json'}) || {};

    if(!users[user]) return false;
    const {token, exp} = users[user];
    return (token === session_token && Date.now() < exp);
}

async function saveSession(user, session_token){
    const userStore = getStore('userStore');
    const users = await userStore.get('users', {type: 'json'}) || {};

    users[user] = {token: session_token, exp: Date.now() + 2.592e+8 };//current time + 3 days
    
    await userStore.setJSON('users', users);
}

function getCookie(cookies, key){
    if(!cookies) return;
    const cookies_arr = cookies.split(';');
    let val;
    for(let i = 0; i < cookies_arr.length; i++){
        if(cookies_arr[i].trim().startsWith(key + '=')){
            val = cookies_arr[i].split('=')[1]
            break;
        }
    }
    return val;
}

//Exports
module.exports = router;