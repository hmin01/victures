const express = require('express');
const router = express.Router();
// DB
const userDB = require('../model/user');

router.get('/', (req, res) => {

});

/* Register user */
router.post('/', async (req, res) => {
    const info = JSON.parse(decodeURIComponent(req.body.info));
    const result = await userDB.register(info);
    res.json(result);
});

/* Delete user */
router.delete('/', async (req, res) => {
    const id = req.body.id;
    const result = await userDB.delete(id);
    res.json(result);
});

module.exports = router;