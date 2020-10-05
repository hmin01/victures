// Check blank
function checkBlank(value) {
    if (value === undefined || value === null || value === "") {
        return true;
    } else {
        const blankPattern = /^\s+|\s+$/g;
        return value.replace(blankPattern, "") === "";
    }
}

function checkUrlFormat(value) {
    if (value === undefined || value === null || value === "") {
        return false;
    } else {
        const urlPattern = /((\w+)?(:(\w+))?@)?([^\/\?:]+)(:(\d+))?(\/?([^\/\?#][^\?#]*)?)?(\?([^#]+))?(#(\w*))?/;
        console.log(urlPattern.test(value));
        return urlPattern.test(value);
    }
}