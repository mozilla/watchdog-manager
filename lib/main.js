"use strict";

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
var config = require('config');
var passwords = require('passwords_mock');
var zxcvbn = require('lib/zxcvbn').zxcvbn;

var AUTOMATION_CONFIG = JSON.parse(self.data.load('workers.json'));

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


/** Returns a randomly generated password. */
function generatePassword() {
    return Math.random().toString(); // FIXME: this is a bad password.
}

/**
 * Initiates password change procedure for given site.
 */
function changePassword(siteURL, callbackMap, newPassword, username) {
    // Initialize default values
    if(callbackMap === null || callbackMap === undefined) {
        callbackMap = {
            success: function() {},
            error: function() {}
        };
    }

    if(newPassword === null) {
        newPassword = generatePassword();
    }

    var passwordMgrEnabled = passwords.getLoginSavingEnabled(url(siteURL).host);

    function disableInPasswordManager(_siteURL) {
        var urlObj = url(_siteURL);
        passwords.setLoginSavingEnabled(urlObj.scheme + '://' + urlObj.host,false);
    }
    
    // After automation is finished, re-enable the password 
    // manager for a given domain, if it was enabled before.
    function reEnableInPasswordManager(_siteURL) {
        var urlObj = url(_siteURL);
        if (passwordMgrEnabled)
            passwords.setLoginSavingEnabled(urlObj.scheme + '://' + urlObj.host,true);
    }

    // Add common behaviors to callbacks
    var originalSuccess = callbackMap.success || function(){};
    callbackMap.success = function() {
        reEnableInPasswordManager(siteURL);

        addNotification('Successfully changed password for ' + siteURL);
        originalSuccess();
    };

    var originalError = callbackMap.error || function(){};
    callbackMap.error = function() {
        reEnableInPasswordManager(siteURL);

        addNotification('Error changing password for ' + siteURL);
        originalError();
    };
    
    // Disable the password manager for this hostname while
    // we're automating.
    disableInPasswordManager(siteURL);

    if(siteURL in AUTOMATION_CONFIG) { // Set up and launch automation
        var siteInfo = AUTOMATION_CONFIG[siteURL];
        // Get the password
        passwords.search(
        (function() { // Only include username in the search if we were given it.
            if(! (username === undefined || username === null)) {
                this.username = username;
            }

            return this;
        }).apply({ // Search options:
            url: siteURL,
            onComplete: function(credentials) {
                if(credentials.length === 0) {
                    console.log('No credentials found for this site! ' + siteURL + ' That was unexpected.');
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
        }));
    } else {
        addNotification('Password change requested for ' + siteURL +
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
                                passwords.updatePasswordForLogin(data.site,data.params.username,data.params.new_password);
                                worker.port.emit('success', {
                                    callbackID: data.callbackID
                                });
                            },
                            'error': function() {
                                worker.port.emit('failure', {
                                    callbackID: data.callbackID
                                });
                            }
                        }, data.params.new_password, data.params.username);
                    });
                }
            });
        }
    });
}

(function() { /*** Alerts when navigating on sites with bad passwords ***/
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
})();
