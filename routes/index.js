var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('index', { title: 'Express' });
});

/* Login page */
router.get('/login', (req, res) => {
  res.render('login');
});

module.exports = router;
