"use strict";

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
 *     Also must contain the following callbacks:
 *     - success
 *     - error
 *
 */
exports.automate = function(formulaFile, startPage, tasks, params, callbackMap) {
    function callback(name, content) {
        if(name in callbackMap) {
            callbackMap[name](content);
        } else {
            console.log("automation: tried executing callback, but it doesn't exist - " + name);
        }
    }

    function workerMessageHandler(message) {
        switch(message.type) {
            case 'addTask':
                tasks.push(message.content);
                break;
            case 'event':
                callback('event', message.content);
                break;
            case 'finish_automation':
                callback('success');
                break;
            case 'raise_error':
                callback('error', message.content);
                break;
            default:
                console.log('Received message from worker', JSON.stringify(message));
                break;
        }
    }

    function automateTab(tab) {
        var tabWorker = tab.attach({
            contentScriptFile: [
                data.url('lib/jquery.js'),
                data.url('js/automation_helpers.js'),
                data.url('workers/' + formulaFile)
            ],
            contentScriptWhen: 'ready',
            onMessage: workerMessageHandler
        });

        tabWorker.port.emit('setParams', {
            params: params
        });

        // Send the next task to the worker.
        tabWorker.port.emit('startTask', tasks.shift());
    }

    tabs.open({
        url: startPage,
        onReady: automateTab
    });
};
