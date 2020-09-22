const express = require('express');
const router = express.Router();

/* Step 1 page */
router.get('/', (req, res) => {
    res.render('convert/import');
});

/* Step 2 page */
router.get('/info', (req, res) => {
    res.render('convert/info');
});

/* Step 3 page */
router.get('/select', (req, res) => {
    res.render('convert/select');
});

module.exports = router;