var callbacks = {};

var lastCallbackID = 0;

self.port.on('credentials', function(data) {
    unsafeWindow.addCredentials(data.credentials);
});

self.port.on('passwords_score', function(data) {
    unsafeWindow.addPasswordsScore(data.score);
});

['success', 'error', 'cancel'].forEach(function(callbackType) {
    self.port.on(callbackType, function(data) {
        callbacks[data.callbackID][callbackType]();
    });
});

unsafeWindow.getCredentials = function() {
    self.port.emit('get_credentials',{});
};

unsafeWindow.getPasswordsScore = function() {
    self.port.emit('get_passwords_score', {});
};

unsafeWindow.showPasswordsScorePanel = function() {
    self.port.emit('show_passwords_score', {});
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

unsafeWindow.bulkChangePasswords = function(sites) {
    sites.forEach(function(site) {
        site.callbackID = ++lastCallbackID;
        callbacks[lastCallbackID] = site.callbacks;
    });

    self.port.emit('bulk_change', sites);
};
