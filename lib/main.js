var addontab = require('addon-page');
var pagemod = require('page-mod');
var self = require('self');
var ss = require('simple-storage');
var tabs = require('tabs');
var widget = require('widget').Widget;

var alerts = require('alerts');
var passwords = require('passwords_mock');

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
                        return {
                            site: credential.url,
                            username: credential.username,
                            lastChanged: credential.lastChanged,
                            password: credential.password
                        };
                    });
                    worker.port.on('get_credentials', function() {
                        worker.port.emit('credentials', credentials);                        
                    });
                }
            });
        }
    });
}

widget({
    id: 'watchdog-manager',
    label: 'Watchdog Manager',
    width: 30,
    content: 'WD',
    onClick: openManager
});


/**
 * Initiates password change procedure for given site.
 */
function changePassword(site) {
    // TODO: stub; will interface with remainder of password-change machinery
    console.log('User requested password change', site);
}

(function() { /*** Notify about old passwords ***/
    /** How old does a password need to be, to be considered old? */
    var OLD_PASSWORD_AGE = 1000 * 60 * 60 * 24 * 30 * 3; // 3 months

    /** If a user refuses to change the password, when do we bother them again? */
    var REPEAT_NOTIFICATION_AFTER = 1000 * 60 * 60 * 24 * 7; // 7 days

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
     * @param {String} The URL of the site where the user should change their
     *     password.
     */
    var displayPasswordChangeAlert = function(site) {
        alerts.addAlert("You've had the same password on this site for a while. Would you like to change it now?",
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
            console.log(JSON.stringify(credential));

            var now = Date.now();
            var age = now - credential.changed;

            if(age > OLD_PASSWORD_AGE) { // Password is old!
                if( (! credential.notified) || // No prior notifications
                    (( credential.notified !== IGNORE) && // Or, password not ignored
                     (now - credential.notified > REPEAT_NOTIFICATION_AFTER)))
                      // And we haven't notified about it recently
                {
                    // Remember that we're displaying the alert.
                    setNotified(site, now);

                    // Prompt the user
                    displayPasswordChangeAlert(site);
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
