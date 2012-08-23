"use strict";

var passwords = require('passwords_mock');
var panel = require('panel').Panel;
var self = require('self');
var tabs = require('tabs');
var url = require('url').URL;

var automation = require('automation');
var notifs = require('notifs');
var score = require('score');
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

function createThenChangePasswordMultiple(sites) {
    var createPasswordPanel = panel({
        width: 500,
        height: 500,
        contentURL: self.data.url('new_password_bulk.html'),
        contentScriptFile:
            ['lib/jquery.js', 'js/password.js', 'js/new_password_bulk.js'].map(function(file) {
                return self.data.url(file);
            })
    });

    createPasswordPanel.port.emit('sites', sites.map(function(site) {
        return {
            url: site.site,
            username: site.params.username
        };
    }));

    createPasswordPanel.show();

    var handleNewPasswords = function(passwords) {
        createPasswordPanel.hide();

        if(sites.length !== passwords.length) {
            throw new Error('number of sites and passwords doesn\'t match!');
        }

        sites.forEach(function(site, index) {
            changePassword(site.site, site.callbackMap, passwords[index],
                site.username);
        });
    };

    createPasswordPanel.port.on('passwords', handleNewPasswords);

    createPasswordPanel.on('hide', function() {
        createPasswordPanel.destroy();

        sites.forEach(function(site) {
            site.callbackMap.cancel(); // FIXME: hide is called not only on cancel
        });
    });
}

function openManager() {
    tabs.open({
        url: self.data.url('index.html'),
        onReady: function(tab) {
            // Open the password manager page
            var worker = tab.attach({
                contentScriptFile: [
                    self.data.url('js/manager_content_script.js')
                ]
            });

            // Get the passwords so they can be sent to the manager page
            passwords.getLogins({
                onComplete: function(credentials) {
                    // Collect information needed about each entry
                    var credentialsTable = credentials.map(function(credential) {
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

                    // Send all credential information to the manager page
                    worker.port.on('get_credentials', function() {
                        worker.port.emit('credentials', {
                            'credentials': credentialsTable
                        });                        
                    });
                    
                    worker.port.on('get_passwords_score', function() {
                        worker.port.emit('passwords_score', {
                            'score': score.scorePasswordUsage(credentials)
                        });                        
                    });
                    
                    worker.port.on('show_passwords_score', function() {
                        score.showPasswordUsagePanel();
                    });

                    /*** Process password change requests */

                    var callback = function(callbackName, site) {
                        return function() {
                            worker.port.emit(callbackName, {
                                callbackID: site.callbackID
                            });
                        };
                    };

                    var makeCallbackMap = function(site) {
                        var callbackMap = {};
                        ['success', 'error', 'cancel'].forEach(function(cb) {
                            callbackMap[cb] = callback(cb, site);
                        });
                        return callbackMap;
                    };

                    // Change password for single site
                    worker.port.on('run_automation_worker', function(data) {
                        var callbackMap = makeCallbackMap(data);
                        createThenChangePassword(data.site, callbackMap,
                            data.params.username);
                    });

                    // Change password for multiple sites
                    worker.port.on('bulk_change', function(sites) {
                        // Make callbackMaps
                        sites.forEach(function(site) {
                            site.callbackMap = makeCallbackMap(site);
                        });

                        createThenChangePasswordMultiple(sites);
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
