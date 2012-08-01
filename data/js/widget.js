document.getElementById('logo').onclick = function() {
    self.port.emit('showManager');
};

document.getElementById('notifications').onclick = function() {
    self.port.emit('showNotifications');
};

var notificationCount = 0;
function addNotification() {
    document.getElementById('notifications').innerHTML = ++notificationCount;
}

self.port.on('notification', addNotification);
