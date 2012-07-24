var self = require('self');
var tabs = require('tabs');
var addontab = require('addon-page');
var widget = require('widget').Widget;

function openManager() {
    tabs.open({
        url: self.data.url('index.html'),
        onReady: function(tab) {
            var worker = tab.attach({
                contentScriptFile: self.data.url('manager.js')
            });

            worker.port.emit('credential', {
                site: 'example.com',
                username: 'test',
                hash: '||||||',
                age: '3 months',
                strength: '3/5'
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
