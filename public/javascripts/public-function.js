// Check blank
function checkBlank(value) {
    if (value === undefined || value === null || value === "") {
        return true;
    } else {
        const blankPattern = /^\s+|\s+$/g;
        return value.replace(blankPattern, "") === "";
    }
}