const {Cc,Ci,Cu} = require("chrome");
var loginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);

// Mimics the Jetpack password search function (see: https://addons.mozilla.org/en-US/developers/docs/sdk/1.0/packages/addon-kit/docs/passwords.html)
// but includes extra info, i.e. password ages.
exports['getLogins'] = function (options) {
    var logins = loginManager.getAllLogins();    
    var retval = logins.map(function(login) {
        const fields = ["username","password","usernameField","passwordField","formSubmitURL"];
        var loginObj = {};
        fields.forEach(function(field) {
            loginObj[field] = login[field];
        });
        // 'hostname' field appears to be a URL.
        loginObj['url'] = login['hostname'];
        loginObj['realm'] = login['httpRealm'];
        loginObj['lastChanged'] = login.QueryInterface(Ci.nsILoginMetaInfo).timePasswordChanged;
        return loginObj;
    });
    options.onComplete(retval);
}

exports['updatePasswordForLogin'] = function (siteHostname,username,newPassword) {
    var logins = loginManager.findLogins({}, siteHostname, "", "").filter(function(x) {
        return x.username == username;
    });
    if (logins.length != 1) {
        throw new Error("Could not find login " + username + " for site " + siteHostname);
    }
    var login = logins[0];
    var newLogin = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
    // Reconstruct nsiLoginInfo object
    newLogin.init(login.hostname,login.formSubmitURL,login.httpRealm,login.username,login.password,login.usernameField,login.passwordField);    
    // Overwrite password field
    newLogin.password = newPassword;
    loginManager.modifyLogin(login, newLogin);
}

exports.getLoginSavingEnabled = loginManager.getLoginSavingEnabled;
exports.setLoginSavingEnabled = loginManager.setLoginSavingEnabled;

exports.search = require('passwords').search;
