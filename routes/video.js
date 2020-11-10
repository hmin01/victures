const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
// DB
const videoDB = require('../model/video');

router.get('/', async (req, res) => {
    if (req.session.video !== undefined && req.session.video.pIndex !== undefined && req.session.video.info !== undefined) {
        // Check exist (video and subtitles)
        let tempPath = path.join(__dirname, `../public/workspace/${req.session.video.pIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(tempPath)) {
            fs.rmdirSync(tempPath, {recursive: true});
        }
        // Check exist (state file)
        const stateDirPath = path.join(__dirname, "../public/temp");
        tempPath = path.join(stateDirPath, `state_download_${req.session.video.pIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(stateDirPath) && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        tempPath = path.join(stateDirPath, `state_extractKeywords_${req.session.video.pIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(stateDirPath) && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        tempPath = path.join(stateDirPath, `state_extractFrames_${req.session.video.pIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(stateDirPath) && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
    
    delete req.session.video;
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
router.get('/pictures', async function(req, res) {
    const videoID = req.query.id;
    const result = await videoDB.getVideoInfo(videoID, "id");
    if (result.result) {
        res.render('view', {id: videoID, title: result.message.video_title, url: result.message.video_url});
    } else {
        console.error(result.message);
        res.redirect('/');
    }
});

/* picture list page */
router.get('/pictures/list', async function(req, res) {
    const videoID = req.query.id;

    let frames = [], subtitles = []
    let selectResult = await videoDB.getFrames(videoID);
    if (selectResult.result) {
        frames = selectResult.message;
    } else {
        res.json(selectResult);
        return;
    }

    selectResult = await videoDB.getSubtitles(videoID);
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