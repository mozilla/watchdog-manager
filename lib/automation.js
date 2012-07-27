
const dataDir = require("self").data;
const observers = require("observer-service");
const panel = require("panel");
const pageWorker = require("page-worker");
const tabs = require('tabs');
const url = require("url");

const main = require("main");

// var automatorPane = require('automator_pane_manager').automatorPane;

var workersRunning = [];

var returnedValues = {};

var automationWorkers = {};
returnedValues = {};


const AUTOMATION_CONFIG = {
    'www.facebook.com': {
        'url': 'https://www.facebook.com/settings?tab=account&section=password',
        'content_script': 'www.facebook.com.js'
    }
};

exports['AUTOMATION_CONFIG'] = AUTOMATION_CONFIG;

function workerMessageHandler(msg) {
    if (msg.type) {
        switch(msg.type) {
            case "raise_error":
				main.raiseError(msg.error);
				break;
            case "register_worker":
                automationWorkers[msg.id] = msg.func.toString();
                break;
            case "run_worker":
                spawnWorkerForPage(msg.url, msg.id, msg.visual);
				workersRunning.push(msg.id);
                break;
            case "return_value":
				returnedValues[msg.key] = msg.value;
                break;
			case "fetch_setting":
				this.port.emit("fetch_setting_callback",{
					callback_id: msg.callback_id,
					value: testSettings[msg.setting_name]
				});
				break;
			case "finish_automation":
				var workerIdx = workersRunning.indexOf(msg.worker_id);
				if (workerIdx != -1)
					workersRunning.splice(workerIdx,1);
				if (workersRunning.length == 0)
					main.finishAutomation(returnedValues);
				break;
        }
    }
    if (msg.error) {
        // automator_pane_manager.showError(msg.error);
        return;
    }
}

exports['spawnWorkerForPage'] = function(workerName, hostname, params, visual) {
    var pageWorkerParams = {
        width: 500,
        height: 500, 
        contentURL: AUTOMATION_CONFIG[hostname].url,
        contentScriptFile: [dataDir.url('lib/jquery.js'),
							dataDir.url('lib/uuid.js'),
							dataDir.url('js/automation_helpers.js')],
        contentScriptWhen: 'ready',
        onMessage: workerMessageHandler
    };
    console.log('spawnWorkerForPage');
    pageWorkerParams.contentScriptFile.push(dataDir.url('workers/' + AUTOMATION_CONFIG[hostname].content_script));
    if (visual) {
        tabs.open({
            url: url,
            onReady: function(tab) {
                var worker = tab.attach(pageWorkerParams);
                sendParamsAndStart(worker);
            }
        });
    }
    else {
        var worker = pageWorker.Page(pageWorkerParams);
        sendParamsAndStart(worker);
    }
    function sendParamsAndStart(worker) {
        worker.port.on('debug_msg',function(data){
            console.log(JSON.stringify(data));
        });
        worker.port.emit('params',params);
        worker.port.emit('start_worker', {
            "worker": workerName
        });
    }
}