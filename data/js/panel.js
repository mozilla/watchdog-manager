function addNotification(notification) {
    var item = document.createElement('li');
    item.appendChild(document.createTextNode(notification));
    var container = document.getElementById('notifications');
    container.insertBefore(item, container.firstChild);
}

self.port.on('notification', addNotification);
