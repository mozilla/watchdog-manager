var callbacks = {};

var lastCallbackID = 0;

self.port.on('credentials', function(data) {
    unsafeWindow.addCredentials(data.credentials);
});

self.port.on('success', function(data) {
    callbacks[data.callbackID].success();
});

self.port.on('failure', function(data) {
    callbacks[data.callbackID].failure();
});

unsafeWindow.getCredentials = function() {
    self.port.emit('get_credentials',{});
}

unsafeWindow.runAutomationWorker = function(worker,site,params,successCallback,failureCallback) {
    self.port.emit('run_automation_worker', {
        worker: worker,
        site: site,
        params: params,
        callbackID: ++lastCallbackID
    });
    callbacks[lastCallbackID] = {
        'success': successCallback,
        'failure': failureCallback
    };
}