self.port.on('credentials', function(data) {
	unsafeWindow.addCredentials(data);
});

unsafeWindow.getCredentials = function() {
	self.port.emit('get_credentials',{});
}