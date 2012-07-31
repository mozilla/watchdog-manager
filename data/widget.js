document.getElementById('logo').onclick = function() {
    self.port.emit('manager');
}
