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
            url: url
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
        if (req.session.video.info === undefined || req.session.video.info === null) {
            video.import(req.session.video.url, function(result) {
                if (result.result) {
                    // Calculate duration (convert string)
                    const duration = result.videoInfo.duration;
                    const d_h = Math.floor(duration / 3600);
                    const d_m = Math.floor((duration % 3600) / 60);
                    const d_s = duration % 60;
                    const hour = d_h === 0 ? 0 : (d_h < 10 ? "0" + d_h : d_h);
                    const munite = d_m < 10 ? "0" + d_m : d_m;
                    const seconds = d_s < 10 ? "0" + d_s : d_s;
                    // Upload date (convert format: YYYYMMDD -> YYYY-MM-DD)
                    const rawUploadDate = result.videoInfo.upload_date.toString();
                    const uploadDate = `${rawUploadDate.slice(0, 4)}-${rawUploadDate.slice(4, 6)}-${rawUploadDate.slice(6)}`;
                    // Save video data in session
                    req.session.video.info = {
                        id: result.videoInfo.id,
                        url: result.videoInfo.webpage_url,
                        title: result.videoInfo.title,
                        description: result.videoInfo.description,
                        author: result.videoInfo.uploader,
                        authorUrl: result.videoInfo.uploader_url,
                        uploadDate: uploadDate,
                        thumbnail: result.videoInfo.thumbnail,
                        categories: result.videoInfo.categories,
                        tags: result.videoInfo.tags,
                        viewCount: result.videoInfo.view_count,
                        averageRating: result.videoInfo.average_rating,
                        duration: result.videoInfo.duration,
                        durationString: hour === 0 ? `${munite}분 ${seconds}초` : `${hour}시 ${munite}분 ${seconds}초`,
                        subtitls: result.subtitls
                    };
                    res.json({result: true, message: req.session.video.info});
                } else {
                    res.json(result);
                }
            });
        } else {
            res.json({result: true, message: req.session.video.info});
        }
    }
});

/* Step 3 page */
router.get('/step/select', (req, res) => {
    res.render('convert/select');
});

module.exports = router;