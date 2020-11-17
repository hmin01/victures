const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
// Module
const video = require('../modules/video');
// DB
const videoDB = require('../model/video');
const e = require('express');
const { render } = require('ejs');
// Temp path (데이터 처리 중 발생하는 임시 데이터를 저장하기 위한 폴더)
const workspaceDirPath = path.join(__dirname, "../public/workspace");
if (!fs.existsSync(workspaceDirPath)) {
    fs.mkdirSync(workspaceDirPath);
}

/* [Step 1] Input video URL page */
router.get('/step/input', (req, res) => {
    let url = "";
    if (req.session.video !== undefined && req.session.video.url !== undefined) {
        url = req.session.video.url;
    }

    res.render('./process/step1_input', {url: url});
});

/* Parse URL API (support only youtube) */
router.post('/parse/url', (req, res) => {
    const url = decodeURIComponent(req.body.url);
    
    const result = video.parseUrl(url);
    if (result.result) {
        req.session.video = {
            url: url
        };
    }
    // Return
    res.json(result);
});

/* [Step 2] Video info Page */
router.get('/step/info', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.redirect(401, '/process/step/input');
    } else {
        res.render('./process/step2_info');
    }
});

/* Get video info API */
router.post('/info', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Not found video url"});
    } else {
        video.getInfo(req.session.video.url, function(result) {
            if (!result.result) {
                console.error(result.message);
                res.json(result);
            } else {
                // Duration 변환 (format: HH시 mm분 ss초)
                const duration = convertDuration(result.videoInfo.duration);
                // Update date 변환 (YYYYMMDD -> YYYY/MM/DD)
                const rawUploadDate = result.videoInfo.upload_date;
                const uploadDate = `${rawUploadDate.slice(0, 4)}/${rawUploadDate.slice(4, 6)}/${rawUploadDate.slice(6)}`;
                // 세션에 영상 정보를 저장
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
                    durationString: duration,
                    subtitles: result.subtitles
                }
                // 중복된 영상 처리를 위한 duplication protection index 생성
                req.session.video.dpIndex = (Date.now()).toString();
                // Return
                res.json({result: true, message: req.session.video.info});
            }
        });
    }
});

/* [Step 3] Process page */
router.get('/step/extract', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.redirect(401, '/process/step/input');
    } else {
        res.render('./process/step3_process');
    }
});

/* Downlaod video API */
router.post('/download', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Not found video url"});
    } else {
        try {
            // 다운로드 상태 확인을 위한 파일 생성
            const workspacePath = path.join(workspaceDirPath, `state_download_${req.session.video.dpIndex}_${req.session.video.info.id}`);
            fs.writeFileSync(workspacePath, "yet");
            // 영상 다운로드
            video.download(req.session.video.dpIndex, req.session.video.info.id, req.session.video.url, function(result) {
                // 영상 다운로드 상태를 파일에 저장
                if (result.result) {
                    fs.writeFileSync(workspacePath, "success");
                } else {
                    fs.writeFileSync(workspacePath, "fail");
                }
            });
            // Return
            res.json({result: true});
        } catch (err) {
            res.json({result: false, message: err.message});
        }
    }
});

/* Extract keyword API (from subtitle) */
router.post('/extract/keyword', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Not found video url"});
    } else {
        try {
            // 키워드 추출 상태를 저장하기 위한 파일 생성
            const workspacePath = path.join(workspaceDirPath, `state_extractKeyword_${req.session.video.dpIndex}_${req.session.video.info.id}`);
            fs.writeFileSync(workspacePath, "yet");
            // 키워드 추출
            video.extractKeywords(req.session.video.dpIndex, req.session.video.info, function(result) {
                // 키워드 추출 상태를 저장
                if (result.result) {
                    fs.writeFileSync(workspacePath, "success");
                } else {
                    fs.writeFileSync(workspacePath, "fail");
                }
            });
            // Return
            res.json({result: true});
        } catch (err) {
            res.json({result: false, message: err.message});
        }
    }
});

/* Extract frame API (from subtitle) */
router.post('/extract/frame', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Not found video url"});
    } else {
        try {
            // 키워드 추출 상태를 저장하기 위한 파일 생성
            const workspacePath = path.join(workspaceDirPath, `state_extractFrame_${req.session.video.dpIndex}_${req.session.video.info.id}`);
            fs.writeFileSync(workspacePath, "yet");
            // 키워드 추출
            video.extractFrames(req.session.video.dpIndex, req.session.video.info.id, function(result) {
                // 키워드 추출 상태를 저장
                if (result.result) {
                    fs.writeFileSync(workspacePath, "success");
                } else {
                    fs.writeFileSync(workspacePath, "fail");
                }
            });
            // Return
            res.json({result: true});
        } catch (err) {
            res.json({result: false, message: err.message});
        }
    }
});

/* Process state check */
router.get('/state', (req, res) => {
    console.log("CDCD");
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Not found video url"});
    } else {
        try {
            const type = req.query.type;
            const state = fs.readFileSync(path.join(workspaceDirPath, `state_${type}_${req.session.video.dpIndex}_${req.session.video.info.id}`)).toString();
            console.log(state);
            res.json({result: true, message: state});
        } catch (err) {
            res.json({result: false, message: err.message});
        }
    }
});

/* Delete state file (처리가 완료된 후, 상태 파일 삭제) */
router.delete('/state', (req, res) => {
    try {
        // Check exist
        let tempPath = path.join(workspaceDirPath, `state_download_${req.session.video.dpIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(workspaceDirPath) && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        tempPath = path.join(workspaceDirPath, `state_extractKeyword_${req.session.video.dpIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(workspaceDirPath) && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        tempPath = path.join(workspaceDirPath, `state_extractFrame_${req.session.video.dpIndex}_${req.session.video.info.id}`);
        if (fs.existsSync(workspaceDirPath) && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }

        // Return
        res.json({result: true});
    } catch (err) {
        res.json({result: false, message: err.message});
    }
});

/* [Step 4] Select extracted frame */
router.get('/step/select', (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.redirect(401, '/process/step/input');
    } else {
        res.render('./process/step4_select');
    }
});

/* Get extracted frames */
router.get('/result', async (req, res) => {
    if (req.session.video === undefined || req.session.video.url === undefined) {
        res.json({result: false, message: "Not found video url"});
    } else {
        const frameDir = path.join(__dirname, "../public/dist", req.session.video.info.id, req.session.video.dpIndex);
        if (fs.existsSync(frameDir)) {
            // Get processed subtitle
            const result = await video.getProcessedSubtitles(req.session.video.dpIndex, req.session.video.info.id);
            if (result.result) {
                // Get frames
                const list = fs.readdirSync(frameDir);
                const frames = list.map(function(elem) {
                    const index = (elem.replace("frame_", "").split('.'))[0];
                    return {
                        seq: Number(index),
                        url: `/source/${req.session.video.info.id}/${req.session.video.dpIndex}/${elem}`
                    }
                });
                // Sort frames by index
                frames.sort(function(a, b) {
                    return a.seq > b.seq ? 1 : a.seq < b.seq ? -1 : 0;
                });
                // Return
                res.json({result: true, data: result.message, frames: frames});
            } else {
                res.json({result: false, message: result.message});
            }
        } else {
            res.json({result: false, message: "Not found this video process result"});
        }
    }
});

/* Save video data (info, subtitle, frame) */
router.post('/save', async (req, res) => {
    if (req.session.video === undefined || req.session.video.info === undefined) {
        res.json({result: false, message: "Not found video info"});
    } else {
        // Save video info
        let videoID = null;
        let saveResult = await videoDB.addInfo(req.session.video.dpIndex, req.session.video.info);
        if (saveResult.result) {
            videoID = saveResult.message;
        } else {
            res.json({result: false, message: saveResult.message});
            return;
        }
        // Save keyword
        let selectResult = await video.getKeywords(req.session.video.dpIndex, req.session.video.info.id);
        if (selectResult.result) {
            if (selectResult.message.length > 0) {
                // Generate bulk
                const bulk = Object.keys(selectResult.message).map(function(key) {
                    return [videoID, key, selectResult.message[key]];
                });
                // Save
                saveResult = await videoDB.addKeyword(bulk);
                if (!saveResult.result) {
                    res.json({result: false, message: saveResult.message});
                    return;
                }
            }
        } else {
            res.json({result: false, message: selectResult.message});
            return;
        }
        // Save subtitle data and frame
        let processedData = null;
        selectResult = await video.getProcessedSubtitles(req.session.video.dpIndex, req.session.video.info.id);
        if (selectResult.result) {
            const bulkSubtitle = [], bulkFrame = [], language = "ko";
            const selected = JSON.parse(req.body.selected);
            processedData = selectResult.message;

            let index = 1;
            for (const elem of processedData) {
                const isExtracted = JSON.parse(elem.extract);
                if (isExtracted) {
                    bulkSubtitle.push([videoID, language, index, elem.start, elem.end, elem.time, elem.score, elem.sentence, 1, selected[index] ? 1 : 0]);
                    bulkFrame.push([videoID, index, elem.frameIndex, `/source/${req.session.video.info.id}/${req.session.video.dpIndex}/frame_${index}.png`, selected[index] ? 1 : 0]);
                    index++;
                } else {
                    bulkSubtitle.push([videoID, language, null, elem.start, elem.end, elem.time, elem.score, elem.sentence, 0, 0]);
                }
            }
            // Save processed subtitles
            saveResult = await videoDB.addProcessedSubtitle(bulkSubtitle);
            if (!saveResult.result) {
                res.json({result: false, message: saveResult.message});
                return;
            }
            // Save extracted frame
            saveResult = await videoDB.addFrame(bulkFrame);
            if (!saveResult.result) {
                res.json({result: false, message: saveResult.message});
                return;
            }
            // Remove workspace directory
            const tempPath = path.join(__dirname, `../public/workspace/${req.session.video.dpIndex}_${req.session.video.info.id}`);
            if (fs.existsSync(tempPath)) {
                fs.rmdirSync(tempPath, {recursive: true});
            }
            // Return
            res.json({result: true});
        } else {
            res.json({result: false, message: selectResult.message});
            return;
        }
    }
});


/* Function */
function convertDuration(duration) {
    if (isNaN(Number(duration))) {
        return "-";
    } else {
        const d_h = Math.floor(duration / 3600);
        const d_m = Math.floor((duration % 3600) / 60);
        const d_s = Math.floor(duration % 60);

        const str_hour = d_h === 0 ? 0 : (d_h < 10 ? `0${d_h}` : d_h);
        const str_minute = d_m < 0 ? `0${d_m}` : d_m;
        const str_second = d_s < 0 ? `0${d_s}` : d_s;

        return str_hour === 0 ? `${str_minute}분 ${str_second}초` : `${str_hour}시 ${str_minute}분 ${str_second}초`;
    }
}

module.exports = router;