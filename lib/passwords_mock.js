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
