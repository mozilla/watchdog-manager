AutomationHelpers.registerWorker('changePassword', function() {
    var params = AutomationHelpers.getParams();
    
    // Assert that the form exists, and looks like we're used to.
    AutomationHelpers.assert($('#password_old').length == 1);
    AutomationHelpers.assert($('#password_new').length == 1);
    AutomationHelpers.assert($('#password_confirm').length == 1);

    // Wait for the form to be enabled    
    AutomationHelpers.pollUntilTrue(function() {
        // Fill in the form
        $('#password_old').val(params['old_password']);
        $('#password_new').val(params['new_password']);
        $('#password_confirm').val(params['new_password']);
    
        // Send a click event to enable the form submit
        $('input[type="password"]').click();
        
        // Is the form enabled yet?
        return !$('.submit').hasClass('uiButtonDisabled');
    }, function() {
        AutomationHelpers.simulateClick($('.submit').get());
        AutomationHelpers.assert($('.fbSettingsErrorMessage').length == 0);
        var timer = window.setInterval(function() {
            if (!AutomationHelpers.assert($('.fbSettingsErrorMessage').length == 0))
                window.clearInterval(timer);
            if ($('.submit').length == 0) {
                // If the password has been successfully changed, the panels will be closed.
                AutomationHelpers.assert($('.openPanel').length == 0);
                AutomationHelpers.finishAutomation();
                window.clearInterval(timer);
            }
        },300);
    })
});