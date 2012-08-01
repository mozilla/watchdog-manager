function addNotification(notification) {
    var container = document.getElementById('notifications');

    var item = document.createElement('li');

    var closeButton = document.createElement('span');
    closeButton.innerHTML = '&#10006;';
    closeButton.onclick = function() {
        container.removeChild(item);

        self.port.emit('removeNotification');
    }

    item.innerHTML = notification + ' ';
    item.appendChild(closeButton);

    container.insertBefore(item, container.firstChild);
}

self.port.on('notification', addNotification);
