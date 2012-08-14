"use strict";

/*** Alerts when navigating on sites with bad passwords ***/

var pagemod = require('page-mod');
var ss = require('simple-storage');

var alerts = require('alerts');
var config = require('config');
var manager = require('manager_chrome');
var passwords = require('passwords_mock');
var zxcvbn = require('lib/zxcvbn').zxcvbn;

/**
 * Flag to ignore a site for the purpose of notifications
 * (i.e., don't notify about it)
 */
var IGNORE = -1;

// Initialize storage to keep track of past notifications
if(! ('notifications' in ss.storage)) {
    ss.storage.notifications = {};
}
var notificationStorage = ss.storage.notifications;

/**
 * Create an object mapping login form URL to:
 * - when it was last changed
 * - a score representing the strength of the password
 * - number of sites where this password is reused
 * - when we notified about this
 *
 * Note that by doing this only once, during addon initialization, we will
 * miss any changes to credentials during the session. However, this is
 * acceptable because:
 * - credentials that have been added won't need to be changed so soon
 * - credentials are removed rarely, so this not a significant case (TODO)
 */
var sites = {};
passwords.getLogins({
    onComplete: function(credentials) {
        // First pass: gather data about password reuse
        var passwordHash = {};
        credentials.forEach(function(credential) {
            var password = credential.password;

            if(! (password in passwordHash)) {
                passwordHash[password] = 0;
            }

            passwordHash[password]++;
        });

        // Second pass: consolidate data about each credential
        credentials.forEach(function(credential) {
            var formURL = credential.url;

            // Figure out if we've notified about this URL before
            var notified = null;
            if(formURL in notificationStorage) {
                notified = notificationStorage[formURL];
            }

            sites[formURL] = {
                changed: credential.lastChanged,
                score: zxcvbn(credential.password).score,
                reuse: passwordHash[credential.password],
                notified: notified
            };
        });
    }
});

/** Sets the notification status */
var setNotified = function(site, notified) {
    sites[site].notified = notified;
    notificationStorage[site] = notified;
};

/**
 * Prompts the user to change their password on the given site.
 * @param {String} cause A description of why the password needs changed.
 * @param {String} site The URL of the site where the user should change their
 *     password.
 */
var displayPasswordChangeAlert = function(cause, site) {
    var message = cause + " Would you like to change it now?";
    alerts.addAlert(message,
        [
        {
            label: 'Sure!',
            callback: function() {
                manager.createThenChangePassword(site);

                // Remember that the password has been changed.
                // TODO: only do this on success
                sites[site].changed = Date.now();
            }
        },
        {
            label: 'Not now',
            callback: function() {
                // Don't do anything
            }
        },
        {
            label: 'Never',
            callback: function() {
                // Prevent further notifications
                setNotified(site, IGNORE);
            }
        }
        ]
    );
};

/**
 * Given the URL of the current page, displays a notification,
 * if it is time.
 */
var notifyIfNecessary = function(pageURL) {
    // Get the site/base from the URL (protocol + hostname)
    var base = /\w+:\/\/([^\/]*)/;
    var match = base.exec(pageURL);
    if(! match) return;
    var site = match[0];
    var host = match[1];

    if(site in sites) { // This is a form page.
        var credential = sites[site];

        var now = Date.now();
        var age = now - credential.changed;

        var passwordOld = age > config.OLD_PASSWORD_AGE;
        var passwordWeak = credential.score <= config.WEAK_SCORE;
        var passwordReused = credential.reuse >= config.TOO_MUCH_REUSE;

        if(passwordOld || passwordWeak || passwordReused) { // Your password sucks.
            if( (! credential.notified) || // We haven't told you this yet.
                ((now - credential.notified > config.REPEAT_NOTIFICATION_AFTER) &&
                    // Or, we haven't told you this recently,
                 (credential.notified !== IGNORE)))
                    // And, you're not ignoring alerts for this site.
            {
                // Remember that we're displaying the alert.
                setNotified(site, now);

                // Why are we showing you an alert?
                var cause;
                if(passwordOld) {
                    cause = "You've had the same password on this site for a while.";
                } else if(passwordWeak) {
                    cause = "Your password for this site is weak.";
                } else if(passwordReused) {
                    cause = "You use your password for " + host + " on several other sites.";
                }

                displayPasswordChangeAlert(cause, site);
           }
        }
    }
};

pagemod.PageMod({
    include: '*',
    contentScript: '',
    onAttach: function(worker) {
        notifyIfNecessary(worker.tab.url);
    }
});

