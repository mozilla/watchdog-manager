var addontab = require('addon-page');
var self = require('self');
var tabs = require('tabs');
var widget = require('widget').Widget;

var age = require('age');
var passwords = require('passwords_mock');

function openManager() {
    tabs.open({
        url: self.data.url('index.html'),
        onReady: function(tab) {
            var worker = tab.attach({
                contentScriptFile: [self.data.url('js/visualhashing_util.js'),self.data.url('js/manager_content_script.js')]
            });

            passwords.getLogins({
                onComplete: function(credentials) {
                    credentials = credentials.map(function(credential) {
                        return {
                            site: credential.url,
                            username: credential.username,
                            age: age.ageString(credential.lastChanged),
                            password: credential.password,
                            strength: '||||' // TODO
                        };
                    });
					worker.port.on('get_credentials', function() {
						worker.port.emit('credentials', credentials);						
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
