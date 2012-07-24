var MINUTES = 1000 * 60;
var HOURS = 60 * MINUTES;
var DAYS = 24 * HOURS;
var WEEKS = 7 * DAYS;
var MONTHS = 30 * DAYS;
var YEARS = 12 * MONTHS;

function minutes(milliseconds) {
    return Math.floor(milliseconds / MINUTES);
}

function hours(milliseconds) {
    return Math.floor(milliseconds / HOURS);
}

function days(milliseconds) {
    return Math.floor(milliseconds / DAYS);
}

function weeks(milliseconds) {
    return Math.floor(milliseconds / WEEKS);
}

function months(milliseconds) {
    return Math.floor(milliseconds / MONTHS);
}

function years(milliseconds) {
    return Math.floor(milliseconds / YEARS);
}

/**
 * Given a timestamp in milliseconds, returns a human-readable string, saying
 * how long ago this was.
 * */
exports.ageString = function(timestamp) {
    var age = Date.now() - timestamp;

    if(age < 0) {
        throw new Error('date is in the future');
    }

    // TODO: properly handle pluralization
    if(age < 2 * HOURS) {
        return minutes(age) + ' minutes';
    } else if(age < 2 * DAYS) {
        return hours(age) + ' hours';
    } else if(age < 2 * WEEKS) {
        return days(age) + ' days';
    } else if(age < 2 * MONTHS) {
        return weeks(age) + ' weeks';
    } else if(age < 2 * YEARS) {
        return months(age) + ' months';
    } else {
        return years(age) + ' years';
    }
}
