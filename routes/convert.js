const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
// Module
const video = require('../modules/video');
// DB
const videoDB = require('../model/video');
// Temp path
const stateDirPath = path.join(__dirname, "../public/temp");

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
/* [Step 1] parse URL api (support only youtube) */
router.post('/step/import', async (req, res) => {
    const url = decodeURIComponent(req.body.url);
    // Analysis URL
    const result = video.parseUrl(url);
    if (result.result) {
        req.session.video = {
            url: url,
            state: {
                download: "yet"
            }
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

/* [Step 2] Get video info API */
router.post('/step/info', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        if (req.session.video.info === undefined || req.session.video.info === null) {
            // Get video info
            video.getInfo(req.session.video.url, function(result) {
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
                        publisher: result.videoInfo.uploader,
                        publisherUrl: result.videoInfo.uploader_url,
                        uploadDate: uploadDate,
                        thumbnail: result.videoInfo.thumbnail,
                        categories: result.videoInfo.categories !== null ? result.videoInfo.categories : [],
                        tags: result.videoInfo.tags,
                        viewCount: result.videoInfo.view_count,
                        averageRating: result.videoInfo.average_rating,
                        duration: result.videoInfo.duration,
                        durationString: hour === 0 ? `${munite}분 ${seconds}초` : `${hour}시 ${munite}분 ${seconds}초`,
                        subtitles: result.subtitles
                    };
                    // Save process start time in session
                    req.session.video.pIndex = (Date.now()).toString();
                    // Return
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
router.get('/step/process', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.redirect(401, '/convert/step/import');
    } else {
        // 작업 폴더들이 존재하는지 여부를 확인하고 없을 경우, 폴더 생성
        const workspaceDirPath = path.join(__dirname, "../public/workspace");
        if (!fs.existsSync(workspaceDirPath)) {
            fs.mkdirSync(workspaceDirPath);
        }
        const distDriPath = path.join(__dirname, "../public/dist");
        if (!fs.existsSync(distDriPath)) {
            fs.mkdirSync(distDriPath);
        }
        if (!fs.existsSync(stateDirPath))
            fs.mkdirSync(stateDirPath);
        // Create temp state file
        fs.writeFileSync(path.join(stateDirPath, `state_download_${req.session.video.pIndex}_${req.session.video.info.id}`), "yet");
        fs.writeFileSync(path.join(stateDirPath, `state_extractKeywords_${req.session.video.pIndex}_${req.session.video.info.id}`), "yet");
        fs.writeFileSync(path.join(stateDirPath, `state_extractFrames_${req.session.video.pIndex}_${req.session.video.info.id}`), "yet");

        // Render
        res.render('convert/process');
    }
});

/* [Step 3.1] Download video API */
router.post('/step/download', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        video.download(req.session.video.pIndex, req.session.video.info.id, req.session.video.url, function(result) {
            // Create temp state file
            if (!fs.existsSync(stateDirPath))
                fs.mkdirSync(stateDirPath);

            if (result.result) {
                fs.writeFileSync(path.join(stateDirPath, `state_download_${req.session.video.pIndex}_${req.session.video.info.id}`), "success");
            } else {
                fs.writeFileSync(path.join(stateDirPath, `state_download_${req.session.video.pIndex}_${req.session.video.info.id}`), "fail");
            }
        });

        res.json({result: true});
    }
});
/* Check download state (polling) */
router.get('/step/state', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined || req.session.video.state.download === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        const type = req.query.type;
        // Check exist
        if (!fs.existsSync(stateDirPath) || !fs.existsSync(path.join(stateDirPath, `state_${type}_${req.session.video.pIndex}_${req.session.video.info.id}`))) {
            res.json({result: false, message: "Not found state file"});
        } else {
            // Get temp state file
            const state = fs.readFileSync(path.join(stateDirPath, `state_${type}_${req.session.video.pIndex}_${req.session.video.info.id}`)).toString();
            // Save state in session
            req.session.video.state[type] = state;
            // Return
            res.json({result: true, state: state});
        }
    }
});
/* Delete download state file */
router.delete('/step/state', (req, res) => {
    // Check exist
    let tempPath = path.join(stateDirPath, `state_download_${req.session.video.pIndex}_${req.session.video.info.id}`);
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

    // Return
    res.json({result: true});
});
/* Delete download file (for error) */
router.delete('/step/download', (req, res) => {
    // Check exist
    const tempPath = path.join(__dirname, `../public/workspace/${req.session.video.pIndex}_${req.session.video.info.id}`);
    if (fs.existsSync(tempPath)) {
        fs.rmdirSync(tempPath, {recursive: true});
    }

    // Return
    res.json({result: true});
});

/* [Step 3.2] Extract Keyword from subtitles API */
router.post('/step/extract/keywords', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        video.extractKeywords(req.session.video.pIndex, req.session.video.info, function(result) {
            // Create temp state file
            if (!fs.existsSync(stateDirPath))
                fs.mkdirSync(stateDirPath);

            if (result.result) {
                fs.writeFileSync(path.join(stateDirPath, `state_extractKeywords_${req.session.video.pIndex}_${req.session.video.info.id}`), "success");
            } else {
                fs.writeFileSync(path.join(stateDirPath, `state_extractKeywords_${req.session.video.pIndex}_${req.session.video.info.id}`), "fail");
                console.error(result.message);
            }
        });

        res.json({result: true});
    }
});

/* [Step 3.3] Extract frame from video API */
router.post('/step/extract/frames', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        video.extractFrames(req.session.video.pIndex, req.session.video.info.id, function(result) {
            // Create temp state file
            if (!fs.existsSync(stateDirPath))
                fs.mkdirSync(stateDirPath);

            if (result.result) {
                fs.writeFileSync(path.join(stateDirPath, `state_extractFrames_${req.session.video.pIndex}_${req.session.video.info.id}`), "success");
            } else {
                fs.writeFileSync(path.join(stateDirPath, `state_extractFrames_${req.session.video.pIndex}_${req.session.video.info.id}`), "fail");
                console.error(result.message);
            }
        });

        res.json({result: true});
    }
});

/* Step 4 page */
router.get('/step/select', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.redirect(401, '/convert/step/import');
    } else {
        // Render
        res.render('convert/select');
    }
});

/* [Step 4] Get extracted frames */
router.get('/step/select/frames', async (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        // Save extract info
        const frameDir = path.join(__dirname, "../public/dist/", req.session.video.info.id, req.session.video.pIndex);
        if (fs.existsSync(frameDir)) {
            // Get subtitle
            const result = await video.getProcessedSubtitles(req.session.video.pIndex, req.session.video.info.id);
            if (result.result) {
                // Get frames
                const ls = fs.readdirSync(frameDir);
                const frames = ls.map(function (elem) {
                    const index = (elem.replace("frame_", "").split('.'))[0];
                    return {
                        seq: Number(index),
                        url: `/source/${req.session.video.info.id}/${req.session.video.pIndex}/${elem}`
                    };
                });
                // Sort frames by index
                frames.sort(function(a, b) {
                    return a.seq > b.seq ? 1 : a.seq < b.seq ? -1 : 0;
                });
                res.json({result: true, data: result.message, frames: frames});
            } else {
                res.json({result: false, message: result.message});
            }
        } else {
            res.json({result: false, message: "Not found this video frames"});
        }
    }
});

/* [Step 5] Save data */
router.post('/step/save', async (req, res) => {
    if (req.session.video === undefined || req.session.video.info === undefined) {
        res.json({result: false, message: "Invalid process flow"});
    } else {
        // Save video info
        let saveResult = await videoDB.addInfo(req.session.video.pIndex, req.session.video.info);
        if (!saveResult.result) {
            res.json({result: false, message: saveResult.message});
            return;
        }
        // Get video id using uuid
        let videoID = null;
        let selectResult = await videoDB.getVideoID(req.session.video.pIndex, req.session.video.info.id);
        if (selectResult.result) {
            if (selectResult.message.length === 0) {
                res.json({result: false, message: "Not found video data"});
                return;
            } else {
                videoID = selectResult.message.video_id;
            }
        } else {
            res.json({result: false, message: selectResult.message});
            return;
        }
        // Save keyword
        selectResult = await video.getKeywords(req.session.video.pIndex, req.session.video.info.id);
        if (selectResult.result) {
            if (selectResult.message.length > 0) {
                const keywordData = [];
                for (const key of Object.keys(selectResult.message)) {
                    keywordData.push([videoID, key, selectResult.message[key]]);
                }
                console.log(keywordData)
                saveResult = await videoDB.addKeyword(keywordData);
                console.log(saveResult)
                if (!selectResult.result) {
                    res.json({result: false, message: saveResult.message});
                    return;
                }
            }
        } else {
            res.json({result: false, message: selectResult.message});
            return;
        }
        // Save processed subtitle
        let processedSubtitle = null;
        selectResult = await video.getProcessedSubtitles(req.session.video.pIndex, req.session.video.info.id);
        if (selectResult.result) {
            if (selectResult.message.length > 0) {
                const subtitleData = [], language = "ko";
                const selected = JSON.parse(req.body.selected);
                processedSubtitle = selectResult.message;

                let index = 1;
                for (const elem of processedSubtitle) {
                    const isExtracted = JSON.parse(elem.extract)
                    if (isExtracted) {
                        subtitleData.push([videoID, language, index, elem.start, elem.end, elem.time, elem.score, elem.sentence, isExtracted ? 1 : 0, selected[index] ? 1: 0]);
                        index++;
                    } else {
                        subtitleData.push([videoID, language, null, elem.start, elem.end, elem.time, elem.score, elem.sentence, isExtracted ? 1 : 0, 0]);
                    }
                }

                saveResult = await videoDB.addProcessedSubtitle(subtitleData);
                if (!saveResult.result) {
                    res.json({result: false, message: saveResult.message});
                    return;
                }
            }
        } else {
            res.json({result: false, message: selectResult.message});
            return;
        }
        // Save frame
        if (processedSubtitle !== null) {
            const frameData = [];
            const selected = JSON.parse(req.body.selected);
            let index = 1;
            for (const elem of processedSubtitle) {
                const isExtracted = JSON.parse(elem.extract)
                if (isExtracted) {
                    const isSelected = selected[index] === undefined ? 0 : (selected[index] ? 1 : 0);
                    frameData.push([videoID, index,  elem.frameIndex, `/source/${req.session.video.info.id}/${req.session.video.pIndex}/frame_${index}.png`, isSelected]);
                    index++;
                }
            }

            saveResult = await videoDB.addFrame(frameData);
            if (!saveResult.result) {
                res.json({result: false, message: saveResult.message});
                return;
            }
        } else {
            res.json({result: false, message: "save data error"});
            return;
        }
        // Remove workspace directory
        const tempPath = path.join(__dirname, `../public/workspace/${req.session.video.pIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(tempPath)) {
            fs.rmdirSync(tempPath, {recursive: true});
        }
        // Save complete
        res.json({result: true});
    }
})

module.exports = router;