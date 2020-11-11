const fs = require('fs');
const url = require('url');
const childProc = require('child_process');
const path = require('path');
const { fstat } = require('fs');
// Support host list
const supportHost = [
    'youtube.com',
    'www.youtube.com'
]
// Path
const WORKSPACE_DIR = path.join(__dirname, '../public/workspace');
const VIDEO_DIR = path.join(__dirname, '../public/dist');
const PYTHON_DIR = path.join(__dirname, './python');

module.exports = {
    parseUrl: function(urlString) {
        try {
            const parse = url.parse(urlString);
            if (parse.host === undefined || parse.host === null) {
                return {result: false, message: "Invalid url (Please include http/https)"};
            } else if (!supportHost.includes(parse.host)) {
                return {result: false, message: "현재 Beta 버전에서는 Youtube 영상만 지원하고 있습니다."};
            } else {
                return {result: true, message: parse};
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
    getInfo: function(urlString, callback) {
        try {
            const parseResult = this.parseUrl(urlString);
            if (parseResult.result) {
                const command = `youtube-dl -J "${urlString}"`;
                childProc.exec(command, (error, stdout, stderr) => {
                    if (error !== null) {
                        console.error(error.message);
                        callback({result: false, message: error.message});
                    } else {
                        // Save video info
                        const videoInfo = JSON.parse(stdout);
                        // Get subtitle list
                        const command = `youtube-dl --list-subs "${urlString}"`;
                        childProc.exec(command, (error, stdout, stderr) => {
                            if (error !== null) {
                                console.error(error.message);
                                callback({result: false, message: error.message});
                            } else {
                                // Search available subtitles
                                const allSubtitls = stdout.split(`Available subtitles for ${videoInfo.id}:\nLanguage formats\n`);
                                if (allSubtitls.length !== 2) {
                                    callback({result: true, videoInfo: videoInfo, subtitles: []});
                                } else {
                                    // Extract available subtitle list
                                    const rows = allSubtitls[1].split('\n');
                                    const availableSubtitles = [];
                                    for (const elem of rows) {
                                        if (elem !== "") {
                                            const rowSplit = elem.split('vtt, ttml');
                                            availableSubtitles.push(rowSplit[0].trim());
                                        }
                                    }
                                    callback({result: true, videoInfo: videoInfo, subtitles: availableSubtitles});
                                }
                                
                            }
                        });
                    }
                });
            } else {
                callback(parseResult);
            }
        } catch (err) {
            callback({result: false, message: err.message});
        }
    },
    download: function(pIndex, videoUUID, urlString, callback) {
        try {
            const parseResult = this.parseUrl(urlString);
            if (parseResult.result) {
                // Download video
                const filePath = path.join(WORKSPACE_DIR, `${pIndex}_%(id)s/%(id)s.%(ext)s`);
                const args = ['--output', filePath, '-f', '(mp4)[height>=720]', '--all-subs', '--convert-subs', 'srt', urlString];

                const youtubeDL = childProc.spawn('youtube-dl', args);
                // youtubeDL.stdout.on('data', (data) => {console.log(data);});
                youtubeDL.on('close', (code) => {
                    console.info(`spawn exit code: ${code}`);
                    if (code === 0) {
                        const videoDir = path.join(VIDEO_DIR, videoUUID);
                        if (!fs.existsSync(videoDir))
                            fs.mkdirSync(videoDir);

                        callback({result: true});
                    } else {
                        const tempPath = path.join(WORKSPACE_DIR, `${pIndex}_${videoUUID}`);
                        if (fs.existsSync(tempPath)) {
                            fs.rmdirSync(tempPath, {recursive: true});
                        }

                        callback({result: false, message: "Youtube-dl error"});
                    }
                });
            } else {
                callback(parseResult);
            }
        } catch (err) {
            callback({result: false, message: err.message});
        }
    },
    extractKeywords: function(pIndex, videoInfo, callback) {
        try {
            // Check video existence
            const filePath = path.join(WORKSPACE_DIR, `${pIndex}_${videoInfo.id}`);
            if (fs.existsSync(filePath)) {
                let videoFile = null;
                const list = fs.readdirSync(filePath);
                for (const elem of list) {
                    const split = elem.split('.');
                    if (split.length === 2 && split[1] !== "srt") {
                        videoFile = elem;
                    }
                }

                if (videoFile !== null) {
                    const pythonExe = path.join(PYTHON_DIR, '/analysisSubtitle.py');
                    // Child process
                    const python = childProc.spawn('python3', [pythonExe, pIndex, videoFile], {cwd: PYTHON_DIR});
                    python.stdout.on('data', function(data) {
                        console.log('stdout: ' + data);
                    });
                    python.stderr.on('data', function(data) {
                        console.log('stderr: ' + data);
                    });
                    python.on('exit', function(code) {
                        console.log('exit: ' + code);
                    });
                    python.on('close', (code) => {
                        console.info(`pythone exit code: ${code}`);
                        if (code === 0) {
                            callback({result: true});
                        } else {
                            callback({result: false, message: "Extract keywords error (python)"});
                        }
                    });
                } else {
                    callback({result: false, message: `Not found video (ID: ${videoInfo.id})`});
                }
            } else {
                callback({result: false, message: `Not found video directory (ID: ${videoInfo.id})`});
            }
        } catch (err) {
            callback({result: false, message: err.message});
        }
    },
    extractFrames: function(pIndex, videoUUID, callback) {
        try {
            // Check video existence
            const filePath = path.join(WORKSPACE_DIR, `${pIndex}_${videoUUID}`);
            if (fs.existsSync(filePath)) {
                let videoFile = null;
                const list = fs.readdirSync(filePath);
                for (const elem of list) {
                    const split = elem.split('.');
                    if (split.length === 2 && split[1] !== "srt") {
                        videoFile = elem;
                    }
                }

                if (videoFile !== null) {
                    const pythonExe = path.join(PYTHON_DIR, '/extractFrame.py');
                    const python = childProc.spawn('python3', [pythonExe, pIndex, videoFile], {cwd: PYTHON_DIR});
                    python.stdout.on('data', function(data) {
                        console.log('stdout: ' + data);
                    });
                    python.stderr.on('data', function(data) {
                        console.log('stderr: ' + data);
                    });
                    python.on('exit', function(code) {
                        console.log('exit: ' + code);
                    });
                    python.on('close', (code) => {
                        console.info(`pythone exit code: ${code}`);
                        if (code === 0) {
                            callback({result: true});
                        } else {
                            callback({result: false, message: "Extract frames error (python)"});
                        }
                    });
                } else {
                    callback({result: false, message: `Not found video (ID: ${videoUUID})`});
                }
            } else {
                callback({result: false, message: `Not found video directory (ID: ${videoUUID})`});
            }
        } catch (err) {
            callback({result: false, message: err.message});
        }
    },
    getSubtitleList: async function(pIndex, videoUUID) {
        try {
            // Check video existence
            const filePath = path.join(VIDEO_DIR, videoUUID, pIndex);
            if (fs.existsSync(filePath)) {
                const dirContents = fs.readdirSync(filePath);

                const list = [];
                for (const elem of dirContents) {
                    if (/.srt$/.test(elem)) {
                        list.push(elem);
                    }
                }

                return {result: true, message: list};
            } else {
                return {result: false, message: `Not found video directory (ID: ${videoUUID})`};
            }
        } catch (err) {
            return {result: false, message: err.meesage};
        }
    },
    getKeywords: async function(pIndex, videoUUID) {
        try {
            // Check video existence
            const filePath = path.join(WORKSPACE_DIR, `${pIndex}_${videoUUID}`);
            if (fs.existsSync(filePath)) {
                const rawData = fs.readFileSync(path.join(filePath, "keywords.json")).toString();
                const keywords = JSON.parse(rawData);
                return {result: true, message: keywords};
            } else {
                return {result: false, message: `Not found video directory (ID: ${videoUUID})`};
            }
        } catch (err) {
            return {result: false, message: err.meesage};
        }
    },
    getProcessedSubtitles: async function(pIndex, videoUUID) {
        try {
            // Check video existence
            const filePath = path.join(WORKSPACE_DIR, `${pIndex}_${videoUUID}`);
            if (fs.existsSync(filePath)) {
                const rawData = fs.readFileSync(path.join(filePath, "processed.json")).toString();
                const processed = JSON.parse(rawData);
                return {result: true, message: processed};
            } else {
                return {result: false, message: `Not found video directory (ID: ${videoUUID})`};
            }
        } catch (err) {
            return {result: false, message: err.meesage};
        }
    }
};