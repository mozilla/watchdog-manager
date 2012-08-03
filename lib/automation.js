var tabs = require('tabs');
var url = require('url');

var data = require('self').data;

/**
 * Perform automation.
 * @param {String} formulaFile The name of the file that contains the formula
 * @param {startPage} The URL of the page where the formula will first run
 * @param {Array} tasks The tasks that need to be run.
 * @param {Object} params Data that can be used by the formula script
 * @param {Object} callbackMap Object mapping the name of an event emitted by
 *     the formula to the callback to call when that happens.
 *
 */
exports.automate = function(formulaFile, startPage, tasks, params, callbackMap) {
    function workerMessageHandler(message) {
        switch(message.type) {
            case 'addTask':
                tasks.push(message.content);
                break;
            case 'event':
                if(message.type in callbackMap) {
                    callbackMap[message.type](message.content);
                }
                break;
            default:
                console.log('Received message from worker', JSON.stringify(message));
                break;
        }
    }

    function automateTab(tab) {
        var tabWorker = tab.attach({
            contentScriptFile: [
                data.url('workers/' + formulaFile),
                data.url('jquery.js'),
                data.url('automation_helpers.js')
            ],
            contentScriptWhen: 'ready',
            onMessage: workerMessageHandler
        });

        tabWorker.port.emit('setParams', params);

        // Send the next task to the worker.
        tabWorker.port.emit('startTask', tasks.shift());
    }

    tabs.open({
        url: startPage,
        onReady: automateTab
    });
};
