const express = require('express');
const router = express.Router();
// DB
const videoDB = require('../model/video');

router.get('/', async (req, res) => {
    res.render('video');
});

/* Get video list */
router.get('/list', async (req, res) => {
    let page = 0;
    if (req.query.page !== undefined) {
        page = req.query.page;
    }

    const selectResult = await videoDB.getVideoList(page);
    if (selectResult.result) {
        res.json({result: true, message: selectResult.message});
    } else {
        res.json({result: false, message: selectResult.message});
    }
});

/* picture list page */
router.get('/pictures', function(req, res) {
    const videoID = req.query.id;
    res.render('view', {id: videoID});
});

/* picture list page */
router.get('/pictures/list', async function(req, res) {
    const videoID = req.query.id;

    let frames = [], subtitles = []
    let selectResult = await videoDB.getFrames(videoID);
    console.log(selectResult)
    if (selectResult.result) {
        frames = selectResult.message;
    } else {
        res.json(selectResult);
        return;
    }

    selectResult = await videoDB.getSubtitles(videoID);
    console.log(selectResult)
    if (selectResult.result) {
        let index = 0;
        for (const elem of frames) {
            for (;index<selectResult.message.length; index++) {
                if (elem.numbering === selectResult.message[index].numbering) {
                    subtitles.push(selectResult.message[index]);
                    break;
                }
            }
        }
    } else {
        res.json(selectResult);
        return;
    }

    await res.json({result: true, frames: frames, subtitles: subtitles});
});

module.exports = router;