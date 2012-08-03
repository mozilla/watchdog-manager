AutomationHelpers = function() {
    // Maps task names (as passed in to registerTask) to worker functions
    var tasks = {};
    
    // Dict of parameters that were passed to workers
    var workerParams = {};
    
    
    self.port.on("setParams", function(msg) {
        workerParams = msg.params;
    });
    
    self.port.on("startTask", function(task) {
        if(task in tasks)
            tasks[task]();
    });
    
    function postMessageForWorker(msg) {
        self.postMessage(msg);
    }

    return {
            raiseEvent: function(event) {
                postMessageForWorker({
                    type: 'event',
                    content: event
                });
            },
            getParams: function() {
                return workerParams;
            },
            openNewTab: function(url) {
                // TODO
            },
            assert: function(assertion) {
                if (!assertion) {
                    postMessageForWorker({
                        type: 'raise_error',
                        error: 'assertion_failed'
                    });
                }
                return Boolean(assertion);
            },
            // Call a function at an interval until it returns something truthy or after maxTries attempts.
            pollUntilTrue: function(pollFunc,successCallback,pollInterval,maxTries,failureCallback) {
                // Poll by .5 sec by default
                if (!pollInterval)
                    pollInterval = 500;
                if (!maxTries)
                    maxTries = 50;
                var tries = 0;
                var pollID = setInterval(function() {
                    if (pollFunc()) {
                        clearInterval(pollID);
                        if (successCallback)
                            successCallback();
                        return;
                    }
                    maxTries++;
                    if (tries >= maxTries) {
                        clearInterval(pollID);
                        if (failureCallback)
                            failureCallback();
                    }
                }, pollInterval);
            },
            finishAutomation: function() {
                postMessageForWorker({
                    type: 'finish_automation',
                });
            },
            registerError: function(error) {
                postMessageForWorker({
                    type: 'raise_error',
                    error: error
                });
            },
            registerTask: function(name, func) {
                tasks[name] = func;
            },
            registerWorker: function() {
                this.registerTask.apply(this,arguments);
            }, // for backwards-compatibility
            addTaskToQueue: function(taskName) {
                postMessageForWorker({
                    type: 'addTask',
                    content: taskName
                });
            },
            returnValue: function(key,val) {
                // TODO: reimplement returnValue with param system.
                
                // postMessageForWorker({
                //     type: 'return_value',
                //     key: key,
                //     value: val
                // });
            },
            waitForReady: function(callback) {
                $(unsafeWindow.document).bind('ready.watchdog', function() {
                        $(unsafeWindow.document).unbind('ready.watchdog');
                        callback();
                    });
            },
            simulateClick: function(elements) {
                if (!elements) return;
                if (!elements.length) elements = [elements];
                for (var elemIdx = 0; elemIdx < elements.length; elemIdx++) {
                    var evt = window.document.createEvent('MouseEvents');
                    evt.initMouseEvent('click', true, true, window.document.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                    elements[elemIdx].dispatchEvent(evt);
                }
            },
            simulateKeypress: function(elem, character) {
                // Reference: http://stackoverflow.com/questions/961532/firing-a-keyboard-event-in-javascript
                jQuery.event.trigger({ type : 'keypress', which : character.charCodeAt(0) });
            },
            focusAndType: function(elem, stringToType) {
                jQuery(elem).focus();
                for (var charIdx in stringToType) {
                    this.simulateKeypress(elem,stringToType[charIdx]);
                }
            }
        };  
}();
