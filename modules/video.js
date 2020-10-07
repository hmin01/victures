const url = require('url');
const childProc = require('child_process');

// Support host list
const supportHost = [
    'youtube.com',
    'www.youtube.com'
]

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
    import: function(urlString, callback) {
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
                                callback({result: true, videoInfo: videoInfo, subtitls: []});
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
                                callback({result: true, videoInfo: videoInfo, subtitls: availableSubtitles});
                            }
                            
                        }
                    });
                }
            });
        } else {
            callback(parseResult);
        }
    }
};