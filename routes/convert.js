const express = require('express');
const router = express.Router();
// Module
const video = require('../modules/video');

/* Step 1 page */
router.get('/step/import', (req, res) => {
    let url = "";
    // if exist url in session
    if (req.session.video !== undefined && req.session.video.url !== undefined) {
        url = req.session.video.url;
    }
    // Render
    res.render('convert/import', {url: url});
});

router.post('/step/import', async (req, res) => {
    const url = decodeURIComponent(req.body.url);
    // Analysis URL
    const result = video.parseUrl(url);
    if (result.result) {
        req.session.video = {
            url: url,
            info: {}
        };
    }
    // Return
    res.json(result);
});

/* Step 2 page */
router.get('/step/info', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.redirect(401, '/convert/step/import');
    } else {
        res.render('convert/info');
    }
});

router.post('/step/info', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        video.import(req.session.video.url, function(result) {
            if (result.result) {
                const duration = result.message.duration;
                const d_h = Math.floor(duration / 3600);
                const d_m = Math.floor((duration % 3600) / 60);
                const d_s = duration % 60;
    
                const hour = d_h === 0 ? 0 : (d_h < 10 ? "0" + d_h : d_h);
                const munite = d_m < 10 ? "0" + d_m : d_m;
                const seconds = d_s < 10 ? "0" + d_s : d_s;
    
                const uDate = result.message.upload_date.toString();
                req.session.video.info = {
                    id: result.message.id,
                    url: result.message.webpage_url,
                    title: result.message.title,
                    description: result.message.description,
                    author: result.message.uploader,
                    authorUrl: result.message.uploader_url,
                    uploadDate: `${uDate.slice(0, 4)}/${uDate.slice(4, 6)}/${uDate.slice(6)}`,
                    thumbnail: result.message.thumbnails[result.message.thumbnails.length - 1],
                    categories: result.message.categories,
                    tags: result.message.tags,
                    viewCount: result.message.view_count,
                    averageRating: result.message.average_rating,
                    duration: result.message.duration,
                    durationString: hour === 0 ? `${munite}분 ${seconds}초` : `${hour}시 ${munite}분 ${seconds}초`
                };
                res.json({result: true, message: req.session.video.info});
            } else {
                res.json(result);
            }
        });
    }
});

/* Step 3 page */
router.get('/step/select', (req, res) => {
    res.render('convert/select');
});

module.exports = router;