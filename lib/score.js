"use strict";

var panel = require('panel').Panel;
var self = require('self');
var url = require('url').URL;

var config = require('config');
var passwords = require('passwords_mock');
var zxcvbn = require('lib/zxcvbn').zxcvbn;

function unique(items) {
    var ret = [];
    for (var item in items) {
        if (ret.indexOf(items[item]) == -1)
            ret.push(items[item]);
    }
    return ret;
}

// Takes in an array of credentials, as returned by getAllLogins
// Returns an object with two fields
//      - histogram, which maps passwords to the number of times they are reused
//      - sites, which maps site hostnames to lists of passwords used on them
//      - num_sites, the number of different sites the user has saved passwords on
function getPasswordsTable(credentials) {
    // Count of the number of unique sites the user has saved passwords on
    var numSites = 0;
    // Maps sites to passwords used
    var sites = {};
    // Maps passwords to number of times reused
    var passwordUsageCount = {};
    for (var credential in credentials) {
        var password = credentials[credential].password;
        var siteName;
        try {
            siteName = url(credentials[credential].url).host;
        }
        catch (e) {
            // These might not all be valid URLs, e.g. chrome://...
            // So if the URL class throws an error, just use the hostname again.
            siteName = credentials[credential].hostname;
        }
        if (passwordUsageCount[password] === undefined) {
            passwordUsageCount[password] = 1; 
        }
        else {
            passwordUsageCount[password]++;
        }
        if (sites[siteName]) {
            sites[siteName].push(password);
        }
        else {
            numSites++;
            sites[siteName] = [password];
        }
    }
    return {
        'histogram': passwordUsageCount,
        'sites': sites,
        'num_sites': numSites
    };
}

function scorePasswordUsage(credentials) {
    var uniquePasswords = unique(credentials.map(function(credential) {
        return credential.password;
    }));
    
    function scorePasswordStrength() {
        // 3 - All passwords over zxcvbn threshold
        // 2 - Most passwords over zxcvbn threshold
        // 1 - Some passwords over zxcvbn threshold
        // 0 - No passwords over zxcvbn threshold
        var overThreshold = 0;
        
        for (var password in uniquePasswords) {
            if (zxcvbn(uniquePasswords[password]).score >= config.WEAK_SCORE)
                overThreshold++;
        }
        if (overThreshold == 0) return 0;
        if (overThreshold == credentials.length) return 3;
        if (credentials.length/2 < overThreshold) return 2;
        return 1;
    }
        
    function scorePasswordReuse() {
        // A "singleton password" is defined as a password used only on a single site
        // 3 - All sites use only singleton passwords
        // 2 - Most sites use only singleton passwords
        // 1 - Some sites use only singleton passwords
        // 0 - No sites use singleton passwords
        var passwordsTable = getPasswordsTable(credentials);
        var sitesReused = 0;
        for (var site in passwordsTable.sites) {
            var passwordsUsedOnSite = passwordsTable.sites[site];
            var reusedPasswordOnSite = false;
            for (var password in passwordsUsedOnSite) {
                if (passwordsTable.histogram[passwordsUsedOnSite[password]] > 1) {
                    reusedPasswordOnSite = true;
                    break;
                }
            }
            if (reusedPasswordOnSite)
                sitesReused++;
        }
        if (sitesReused == 0) return 0;
        if (sitesReused == passwordsTable.num_sites) return 3;
        if (passwordsTable.num_sites/2 < sitesReused) return 2;
        return 1;
    }
    function scorePasswordAge() {
        // 3 - All passwords under age threshold
        // 2 - Most passwords under age threshold
        // 1 - Some passwords under age threshold
        // 0 - No passwords under age threshold
        var underThreshold = 0;
        var now = (new Date());
        // Maps passwords to the age of the oldest login for that password.
        var passwordAges = {};
        // Number of unique passwords
        var numPasswords = 0;
        // Get the oldest login for each password
        for (var credential in credentials) {
            var password = credentials[credential].password;
            if (passwordAges[password] === undefined) {
                passwordAges[password] = credentials[credential].lastChanged;
                numPasswords++;
            }
            else {
                passwordAges[password] = Math.min(passwordAges[password],credentials[credential].lastChanged);
            }
        }
        for (var password in passwordAges) {
            var timeDelta = now - passwordAges[password]; 
            if (timeDelta < config.OLD_PASSWORD_AGE)
                underThreshold++;   
        }
        if (underThreshold == 0) return 0;
        if (underThreshold == numPasswords) return 3;
        if (numPasswords/2 < underThreshold) return 2;
        return 1;
    }
    return {
        "scores": {
            "strength": scorePasswordStrength(),
            "reuse": scorePasswordReuse(),
            "age": scorePasswordAge(),
            "master": 0 // TODO
        }
    };
}

function showPasswordUsagePanel() {
    var passwordUsagePanel = panel({
        width: 500,
        height: 500,
        contentURL: self.data.url('score_panel.html'),
        contentScriptFile: ['lib/jquery.js', 'lib/underscore.js', 'js/score_panel.js'].map(self.data.url)
    });
    passwords.getLogins({
        onComplete: function(credentials) {
            passwordUsagePanel.port.emit('password_score', {
                "score": scorePasswordUsage(credentials)
            });
            passwordUsagePanel.show();
        }
    });
}

exports['scorePasswordUsage'] = scorePasswordUsage;
exports['showPasswordUsagePanel'] = showPasswordUsagePanel;