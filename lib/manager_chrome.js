"use strict";

var passwords = require('passwords_mock');
var panel = require('panel').Panel;
var self = require('self');
var tabs = require('tabs');
var url = require('url').URL;

var automation = require('automation');
var notifs = require('notifs');
var zxcvbn = require('lib/zxcvbn').zxcvbn;

var AUTOMATION_CONFIG = JSON.parse(self.data.load('workers.json'));

function createThenChangePassword(siteURL, callbackMap, username) {
    // Initialize default values
    if(callbackMap === null || callbackMap === undefined) {
        callbackMap = {};
    }

    if(callbackMap.cancel === undefined) {
        callbackMap.cancel = function() {};
    }

    var createPasswordPanel = panel({
        width: 500,
        height: 500,
        contentURL: self.data.url('new_password.html'),
        contentScriptFile:
            ['lib/jquery.js', 'js/password.js', 'js/new_password.js'].map(self.data.url)
    });

    var handleNewPassword = function(newPassword) {
        createPasswordPanel.hide();
        changePassword(siteURL, callbackMap, newPassword, username);
    };

    createPasswordPanel.show();
    createPasswordPanel.port.on('usePassword', handleNewPassword);

    createPasswordPanel.on('hide', function() {
        createPasswordPanel.destroy();
        callbackMap.cancel();
    });
}

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
                        createThenChangePassword(data.site, {
                            'success': function() {
                                worker.port.emit('success', {
                                    callbackID: data.callbackID
                                });
                            },
                            'error': function() {
                                worker.port.emit('failure', {
                                    callbackID: data.callbackID
                                });
                            },
                            'cancel': function() {
                                worker.port.emit('cancel', {
                                    callbackID: data.callbackID
                                });
                            }
                        }, data.params.username);
                    });
                }
            });
        }
    });
}

/**
 * Initiates password change procedure for given site.
 */

function changePassword(siteURL, callbackMap, newPassword, username) {
    // Initialize default values
    if(callbackMap === null || callbackMap === undefined) {
        callbackMap = {};
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
        passwords.updatePasswordForLogin(siteURL,username,newPassword);

        notifs.addNotification('Successfully changed password for ' + siteURL);
        originalSuccess();
    };

    var originalError = callbackMap.error || function(){};
    callbackMap.error = function() {
        reEnableInPasswordManager(siteURL);

        notifs.addNotification('Error changing password for ' + siteURL);
        originalError();
    };
    
    // Disable the password manager for this hostname while we're automating.
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
                    notifs.addNotification('Multiple accounts found for ' + siteURL +
                        ". Assuming you're signed in as " + credentials.username);
                }
                automation.automate(siteInfo.script, siteInfo.url, ['changePassword'], {
                    'old_password': credentials[0].password,
                    'new_password': newPassword
                }, callbackMap);
            }
        }));
    } else {
        notifs.addNotification('Password change requested for ' + siteURL +
            " but I don't know how to do that yet.");
    }
}

exports['openManager'] = openManager;
exports['createThenChangePassword'] = createThenChangePassword;