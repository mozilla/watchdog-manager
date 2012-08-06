var addontab = require('addon-page');
var pagemod = require('page-mod');
var panel = require('panel').Panel;
var self = require('self');
var ss = require('simple-storage');
var tabs = require('tabs');
var url = require('url').URL;
var widget = require('widget').Widget;

var automation = require('automation');
var alerts = require('alerts');
var passwords = require('passwords_mock');
var zxcvbn = require('lib/zxcvbn').zxcvbn;

var AUTOMATION_CONFIG = {
    'http://www.facebook.com': {
        'url': 'https://www.facebook.com/settings?tab=account&section=password',
        'script': 'www.facebook.com.js'
    },
    'http://t.nm.io': {
        'url': 'http://t.nm.io/password',
        'script': 'treehouse.nm.io.js'
    }
};

/** Returns a randomly generated password. */
function generatePassword() {
    return Math.random().toString(); // FIXME: this is a bad password.
}

/**
 * Initiates password change procedure for given site.
 */
function changePassword(siteURL, callbackMap, newPassword) {
    if(callbackMap === null) {
        callbackMap = {};
    }

    if(newPassword === null) {
        newPassword = generatePassword();
    }

    if(siteURL in AUTOMATION_CONFIG) { // Set up and launch automation
        var siteInfo = AUTOMATION_CONFIG[siteURL];
        // Get the password
        passwords.search({
            url: siteURL,
            onComplete: function(credentials) {
                if(credentials.length === 0) {
                    console.log('No credentials found for this site! That was unexpected.');
                    return;
                } else if(credentials.length > 1) {
                    addNotification('Multiple accounts found for ' + siteURL +
                        ". Assuming you're signed in as " + credentials.username);
                }

                automation.automate(siteInfo.script, siteInfo.url, ['changePassword'], {
                    'old_password': credentials[0].password,
                    'new_password': newPassword
                }, callbackMap);
            }
        });
    } else {
        addNotification('Password change requested for ' + site +
            " but I don't know how to do that yet.");
    }
}

exports['raiseError'] = function(error) {
    console.log('error: ' + JSON.stringify(error));
};

function openManager() {
    tabs.open({
        url: self.data.url('index.html'),
        onReady: function(tab) {
            var worker = tab.attach({
                contentScriptFile: [
                    self.data.url('js/manager_content_script.js')
                ]
            });

            passwords.getLogins({
                onComplete: function(credentials) {
                    credentials = credentials.map(function(credential) {
                        var credentialHostname = url(credential.url).host;
                        return {
                            site: credential.url,
                            can_automate: AUTOMATION_CONFIG[credential.url],
                            username: credential.username,
                            lastChanged: credential.lastChanged,
                            strength: zxcvbn(credential.password),
                            password: credential.password
                        };
                    });

                    worker.port.on('get_credentials', function() {
                        worker.port.emit('credentials', {
                            'credentials': credentials
                        });                        
                    });

                    worker.port.on('run_automation_worker', function(data) {
                        changePassword(data.site, {
                            'success': function() {
                                // TODO: Update password manager
                                addNotification('Successfully changed password for ' + data.site);

                                worker.port.emit('success', {
                                    callbackID: data.callbackID
                                });
                            },
                            'error': function() {
                                addNotification('Error changing password for ' + data.site);

                                worker.port.emit('failure', {
                                    callbackID: data.callbackID
                                });
                            }
                        }, data.params.new_password);
                    });
                }
            });
        }
    });
}

var addNotification;
(function() { /*** Initialize add-on widget and notification panel ***/

var notificationPanel = panel({
    width: 400,
    height: 500,
    contentURL: self.data.url('panel.html'),
    contentScriptFile: self.data.url('js/panel.js')
});

var watchdogWidget = widget({
    id: 'watchdog-manager',
    label: 'Watchdog Manager',
    width: 50,
    contentURL: self.data.url('widget.html'),
    contentScriptFile: self.data.url('js/widget.js')
});

// React to interactions with the widget
watchdogWidget.port.on('showManager', function() {
    notificationPanel.hide();
    openManager();
});

watchdogWidget.port.on('showNotifications', function() {
    notificationPanel.show();
});

// Initialize storage for notifications
if(! ('messages' in ss.storage)) ss.storage.messages = [];
var notifications = ss.storage.messages;

/** Display given notification in panel, increment notification count in widget */
var displayNotification = function(message) {
    notificationPanel.port.emit('notification', message);
    watchdogWidget.port.emit('notification');
};

/** Store notification and display it. */
addNotification = function(message) {
    notifications.push(message);
    displayNotification(message);
};

// Remove notification from storage, decrement notification count
notificationPanel.port.on('removeNotification', function(notification) {
    watchdogWidget.port.emit('removeNotification');
    notifications.splice(notifications.indexOf(notification), 1);
});

// On load:
notifications.forEach(displayNotification);

})();

(function() { /*** Notify about old passwords ***/
    /** How old does a password need to be, to be considered old? */
    var OLD_PASSWORD_AGE = 1000 * 60 * 60 * 24 * 30 * 3; // 3 months

    /** If a user refuses to change the password, when do we bother them again? */
    var REPEAT_NOTIFICATION_AFTER = 1000 * 60 * 60 * 24 * 7; // 7 days

    /** What is considered a weak enough score from zxcvbn to prompt password change? */
    var WEAK_SCORE = 2;

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
                    changePassword(site);

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
        var base = /\w+:\/\/[^\/]*/;
        var match = base.exec(pageURL);
        if(! match) return;
        var site = match[0];

        if(site in sites) { // This is a form page.
            var credential = sites[site];

            var now = Date.now();
            var age = now - credential.changed;

            var passwordOld = age > OLD_PASSWORD_AGE;
            var passwordWeak = credential.score <= WEAK_SCORE;

            if(passwordOld || passwordWeak) {
                if( (! credential.notified) || // No prior notifications
                    (( credential.notified !== IGNORE) && // Or, password not ignored
                     (now - credential.notified > REPEAT_NOTIFICATION_AFTER)))
                      // And we haven't notified about it recently
                {
                    // Remember that we're displaying the alert.
                    setNotified(site, now);

                    // Prompt the user
                    var cause;
                    if(passwordOld) {
                        cause = "You've had the same password on this site for a while.";
                    } else if(passwordWeak) {
                        cause = "Your password for this site is unsecure.";
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
})();
