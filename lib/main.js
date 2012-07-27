var addontab = require('addon-page');
var self = require('self');
var tabs = require('tabs');
var url = require('url').URL;
var widget = require('widget').Widget;

var automation = require('automation');
var passwords = require('passwords_mock');

const AUTOMATION_CONFIG = automation.AUTOMATION_CONFIG;

function runAutomationWorker(worker, site, params) {
	automation.spawnWorkerForPage(worker, site, params);
}

function openManager() {
    tabs.open({
        url: self.data.url('index.html'),
        onReady: function(tab) {
            var worker = tab.attach({
                contentScriptFile: [
                    self.data.url('js/manager_content_script.js')
                ]
            });

            passwords.getLogins({
                onComplete: function(credentials) {
                    credentials = credentials.map(function(credential) {
						var credentialHostname = url(credential.url).host;
                        return {
                            site: credential.url,
							can_automate: AUTOMATION_CONFIG[credentialHostname],
                            username: credential.username,
                            lastChanged: credential.lastChanged,
                            password: credential.password
                        };
                    });
                    worker.port.on('get_credentials', function() {
                        worker.port.emit('credentials', {
							'credentials': credentials
						});                        
                    });
					worker.port.on('run_automation_worker', function(data) {
						runAutomationWorker(data.worker, url(data.site).host, data.params);
					});
                }
            });
        }
    });
}

widget({
    id: 'watchdog-manager',
    label: 'Watchdog Manager',
    width: 30,
    content: 'WD',
    onClick: openManager
});
