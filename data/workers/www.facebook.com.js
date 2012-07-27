AutomationHelpers.registerWorker('changePassword', function() {
    self.port.emit('debug_msg',{
        "msg": "hello!"
    });
});