const express = require('express');
const router = express.Router();
const login = require('../model/user').login;

/* GET home page. */
router.get('/', (req, res) => {
    res.redirect('/video');
});

/* [PAGE] Login */
router.get('/login', (req, res) => {
    res.render('login');
});

/* [API] Login */
router.post('/login', async (req, res) => {
    const info = JSON.parse(decodeURIComponent(req.body.info));
    const result = await login(info);
    res.json(result);
})

/* [Page] Register */
router.get('/register', (req, res) => {
    res.render('register');
})

module.exports = router;
