var PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
var PASSWORD_LENGTH = 16;

function Password() {
    /** Returns random integer on [0, upperBound) */
    function randInt(upperBound) {
        return Math.floor(Math.random() * upperBound);
    }

    /** Returns a random value from the array */
    function selectRandom(array) {
        return array[randInt(array.length)];
    }

    /** Returns a random password of given length using characters in CHARS */
    function generateRandomPassword(length, chars) {
        var password = '';
        for(var i = 0; i < length; i++) {
            password += selectRandom(chars);
        }

        return password;
    }

    this.password = generateRandomPassword(PASSWORD_LENGTH, PASSWORD_CHARS);
}

Password.prototype.toString = function() {
    return this.password;
};
