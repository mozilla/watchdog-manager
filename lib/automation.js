const dataDir = require("self").data;
const observers = require("observer-service");
const panel = require("panel");
const pageWorker = require("page-worker");
const tabs = require('tabs');
const url = require("url");

// var automatorPane = require('automator_pane_manager').automatorPane;

var nextWorkerID = 0;
var workersRunning = {};

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
            console.log('error raised!');
            console.log("worker: " + JSON.stringify(workersRunning[msg.worker_id].failure_callback));
                workersRunning[msg.worker_id].failure_callback();
                delete workersRunning[msg.worker_id];
				break;
            case "register_worker":
                automationWorkers[msg.id] = msg.func.toString();
                break;
            case "run_worker":
                // spawnWorkerForPage(msg.url, msg.id, msg.visual);
                break;
            case "return_value":
                if (msg.key == 'success')
    				returnedValues[msg.key] = msg.value;
                break;
			case "fetch_setting":
				this.port.emit("fetch_setting_callback",{
					callback_id: msg.callback_id,
					value: testSettings[msg.setting_name]
				});
				break;
			case "finish_automation":
                // var workerIdx = workersRunning.indexOf(msg.worker_id);
                // if (workerIdx != -1)
                //     workersRunning.splice(workerIdx,1);
                // if (workersRunning.length == 0)
                //     main.finishAutomation(returnedValues);
                workersRunning[msg.worker_id].callback();
                delete workersRunning[msg.worker_id];
				break;
        }
    }
    if (msg.error) {
        // automator_pane_manager.showError(msg.error);
        return;
    }
}

exports['spawnWorkerForPage'] = function(workerName, hostname, params, callback, failure_callback, visual) {
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
            url: AUTOMATION_CONFIG[hostname].url,
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
        worker.port.emit('set_params',{
            params: params
        });
        worker.port.emit('set_worker_id',{
            'workerID': ++nextWorkerID
        });
        workersRunning[nextWorkerID] = {
            'worker': worker,
            'callback': callback,
            'failure_callback': failure_callback
        };
        worker.port.emit('start_worker', {
            "worker": workerName
        });
    }
}