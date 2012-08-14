"use strict";

var panel = require('panel').Panel;
var self = require('self');
var ss = require('simple-storage');
var widget = require('widget').Widget;

var manager = require('manager_chrome');

/*** Initialize add-on widget and notification panel ***/

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
    manager.openManager();
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
function addNotification(message) {
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

exports['addNotification'] = addNotification;