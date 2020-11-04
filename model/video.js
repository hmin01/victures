const db = require('../helper/db/query')

module.exports = {
    addInfo: async function(pIndex, videoInfo) {
        try {
            // 저장된 Publisher인지 확인
            const selectQ = `select publisher_id from publisher where publisher_name="${videoInfo.publisher}";`;
            const selectResult = await db.selectSync(selectQ);
            if (selectResult.result) {
                let publisherID = null;
                // 저장되지 않은 Publisher인 경우, 우선 Publisher부터 저장
                if (selectResult.message.length === 0) {
                    const insertQ = `insert into publisher (publisher_name, publisher_url) values ("${videoInfo.publisher}", "${videoInfo.publisherUrl}");`;
                    const insertResult = await db.querySync(insertQ);
                    if (!insertResult.result) {
                        return {result: false, message: insertResult};
                    } else {
                        publisherID = insertResult.message.insertId;
                    }
                } else {
                    publisherID = selectResult.message[0].publisher_id;
                }
                // 영상 정보 저장
                let insertQ = `insert into video (p_index, video_uuid, video_url, video_title, duration, upload_date, view_count, description, thumbnail, publisher_id) values (${Number(pIndex)}, "${videoInfo.id}", "${videoInfo.url}", "${videoInfo.title}", ${videoInfo.duration}, "${videoInfo.uploadDate}", ${videoInfo.viewCount}, "${videoInfo.description}", "${videoInfo.thumbnail}", ${publisherID});`;
                // on duplicate key update video_title=values(video_title), upload_date=values(upload_date), view_count=values(view_count), description=values(description), thumbnail=values(thumbnail);`;
                let insertResult = await db.querySync(insertQ);
                if (!insertResult.result) {
                    return {result: false, message: insertResult.message};
                }
                // 영상 카테고리 저장
                if (videoInfo.categories.length > 0) {
                    const categories = await videoInfo.categories.map(function(elem) {
                        return [elem];
                    });
                    insertQ = `insert ignore into category (category_name) values ? `;
                    insertResult = await db.bulkSync(insertQ, categories);
                    if (!insertResult.result) {
                        return {result: false, message: insertResult.message};
                    }
                }
                // 모든 데이터 저장이 올바르게 끝났을 경우
                return {result: true};
            } else {
                return {result: false, message: selectResult};
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    addSubtitle: async function(videoID, dirPath, subtitleList) {
        try {
            // bulk 생성
            const bulk = await subtitleList.map(function(elem) {
                const split = elem.split('.');
                return [videoID, split[1], `${dirPath}${elem}`];
            });
            // Query
            const insertQ = `insert into subtitle (video_id, language, subtitle_url) values ? on duplicate key update subtitle_url=values(subtitle_url);`;
            return await db.bulkSync(insertQ, bulk);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    addProcessedSubtitle: async function(videoID, language, subtitleData) {
        try {
            // bulk 생성
            const bulk = await subtitleData.map(function(elem, index) {
                return [videoID, language, (index + 1),  elem.start, elem.end, elem.time, elem.score, elem.sentence];
            });
            // Query
            const insertQ = `insert into processed_subtitle (video_id, language, numbering, start_time, end_time, view_time, score, sentence) values ? 
            on duplicate key update start_time=values(start_time), end_time=values(end_time), view_time=values(view_time), score=values(score), sentence=values(sentence);`;
            return await db.bulkSync(insertQ, bulk);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    addFrame: async function(frameData) {
        try {
            // Query
            const insertQ = `insert into frame (video_id, numbering, frame_index, frame_url, visible) values ? on duplicate key update frame_index=values(frame_index), visible=values(visible);`;
            return await db.bulkSync(insertQ, frameData);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    getVideoID: async function(pIndex, videoUUID) {
        try {
            // 11자리의 Video UUID를 이용하여 Video ID 검색
            const selectQ = `select video_id from video where video_uuid="${videoUUID}" and p_index=${Number(pIndex)};`;
            const selectResult = await db.selectSync(selectQ);
            if (selectResult.result) {
                if (selectResult.message.length > 0) {
                    return {result: true, message: selectResult.message[0]};
                } else {
                    return {result: false, message: "Not found video"};
                }
            } else {
                return {result: false, message: selectResult.message};
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    getVideoInfo: async function(param, type="id") {
        try {
            let selectQ = `select * from video`;
            if (type === "id") {
                selectQ += ` where video_id=${param};`;
            } else if (type === "uuid") {
                selectQ += ` where video_uuid=${param};`;
            }
            const selectResult = await db.selectSync(selectQ);
            if (selectResult.result) {
                if (selectResult.message.length > 0) {
                    return {result: true, message: selectResult.message[0]};
                } else {
                    return {result: false, message: "Not found video"};
                }
            } else {
                return {result: false, message: selectResult.message};
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    getVideoList: async function(page=0) {
        try {
            const limit = 30, offset = page * 30;
            const selectQ = `select a.video_id, a.video_url, a.video_title, a.thumbnail, a.duration, a.upload_date, a.reg_date, a.view_count, b.publisher_name, count(c.frame_id) as frames from video as a inner join publisher as b on a.publisher_id=b.publisher_id inner join frame as c on a.video_id=c.video_id and c.visible=1 group by a.video_id limit ${limit} offset ${offset};`;
            return await db.selectSync(selectQ);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    getFrames: async function(videoID) {
        try {
            const selectQ = `select numbering, frame_url from frame where visible=1 and video_id=${videoID} order by numbering ASC;`;
            return await db.selectSync(selectQ);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    getSubtitles: async function(videoID) {
        try {
            const selectQ = `select numbering, sentence from processed_subtitle where language="ko" and video_id=${videoID} order by numbering ASC;`;
            return await db.selectSync(selectQ);
        } catch (err) {
            return {result: false, message: err.message};
        }
    }
}