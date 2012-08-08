// TODO: Figure out how to deal with the redirect and finish this.

// URL: https://twitter.com/settings/password

AutomationHelpers.registerWorker('changePassword', function() {
    var params = AutomationHelpers.getParams();
    
    // Assert that the form exists, and looks like we're used to.
    AutomationHelpers.assert($('#current_password').length == 1);
    AutomationHelpers.assert($('#user_password').length == 1);
    AutomationHelpers.assert($('#user_password_confirmation').length == 1);
    AutomationHelpers.assert($('#settings_save').length == 1);
    
    $(document).ready(function() {
        function fillInfoAndClick() {
            // Fill in the form
            $('#current_password').val(params['old_password']);
            $('#user_password').val(params['new_password']);
            $('#user_password_confirmation').val(params['new_password']);
            AutomationHelpers.simulateClick($('#settings_save').get());
    
            AutomationHelpers.addTaskToQueue('verifyPasswordChange');
        }
        // Add a timeout, so that we overwrite the fields *after* the FF password manager.
        setTimeout(fillInfoAndClick,2000);
    });
});

AutomationHelpers.registerWorker('verifyPasswordChange', function() {
    if (window.location == 'https://twitter.com/settings/passwords/password_reset_confirmation') {
        alert('Confirmed successful password change!');
        AutomationHelpers.raiseEvent('success',{});
    }
});
