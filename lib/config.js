const configItems = {
    /** How old does a password need to be, to be considered old? */
     OLD_PASSWORD_AGE: 1000 * 60 * 60 * 24 * 30 * 3, // 3 months

    /** If a user refuses to change the password, when do we bother them again? */
     REPEAT_NOTIFICATION_AFTER: 1000 * 60 * 60 * 24 * 7, // 7 days

    /** What is considered a weak enough score from zxcvbn to prompt password change? */
     WEAK_SCORE: 2,

    /** If you use the same password on this many sites, we will alert you. */
     TOO_MUCH_REUSE: 3
};

for (var item in configItems) {
    exports[item] = configItems[item];
}
