const express = require('express');
const router = express.Router();
// DB
const userDB = require('../model/user');

router.get('/', (req, res) => {

});

/* Register page */
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/', async (req, res) => {
    const info = JSON.parse(decodeURIComponent(req.body.info));

    const result = await userDB.register(info);
    res.json(result);
})

module.exports = router;