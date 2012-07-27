self.port.on('credentials', function(data) {
    unsafeWindow.addCredentials(data.credentials);
});

unsafeWindow.getCredentials = function() {
    self.port.emit('get_credentials',{});
}

unsafeWindow.runAutomationWorker = function(worker,site,params) {
    self.port.emit('run_automation_worker', {
        worker: worker,
        site: site,
        params: params
    });
}