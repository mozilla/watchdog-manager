var {Cc,Ci,Cu} = require("chrome");

var notifBox = function() {
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    return win.gBrowser.getNotificationBox();
};

/**
 * Adds an alert to the current window.
 * Defaults to the PRIORITY_WARNING_MEDIUM alert style.
 * @param {String} message The text to display in the alert
 * @param {Array} options The options to give the user. Each option should be an
 *    object of the form { label: <button text>, callback: <callback> }
 */
exports.addAlert = function(message, options, value) {
    var notif = notifBox();
    notif.appendNotification(message, 'value', null,
        notif.PRIORITY_WARNING_MEDIUM,
        options
    );
};
