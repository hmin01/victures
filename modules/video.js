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
            console.log(parse);
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
                    console.error(error);
                    callback({result: false, messaeg: error});
                } else {
                    console.log(stdout);
                    callback({result: true, message: JSON.parse(stdout)});
                }
            });
        } else {
            callback(parseResult);
        }
    }
};