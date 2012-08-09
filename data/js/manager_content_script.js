var callbacks = {};

var lastCallbackID = 0;

self.port.on('credentials', function(data) {
    unsafeWindow.addCredentials(data.credentials);
});

['success', 'failure'].forEach(function(callbackType) {
    self.port.on(callbackType, function(data) {
        callbacks[data.callbackID][callbackType]();
    });
});

unsafeWindow.getCredentials = function() {
    self.port.emit('get_credentials',{});
};

unsafeWindow.runAutomationWorker = function(worker, site, params, callbackMap) {
    self.port.emit('run_automation_worker', {
        worker: worker,
        site: site,
        params: params,
        callbackID: ++lastCallbackID
    });

    callbacks[lastCallbackID] = callbackMap;
};
