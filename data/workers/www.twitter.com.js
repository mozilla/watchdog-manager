// TODO: Figure out how to deal with the redirect and finish this.

// URL: https://twitter.com/settings/password

AutomationHelpers.registerWorker('changePassword', function() {
    var params = AutomationHelpers.getParams();
    
    // Assert that the form exists, and looks like we're used to.
    AutomationHelpers.assert($('#current_password').length == 1);
    AutomationHelpers.assert($('#user_password').length == 1);
    AutomationHelpers.assert($('#user_password_confirmation').length == 1);
    AutomationHelpers.assert($('#settings_save').length == 1);
    
    // Fill in the form
    $('#current_password').val(params['old_password']);
    $('#user_password').val(params['new_password']);
    $('#user_password_confirmation').val(params['new_password']);
    
    AutomationHelpers.simulateClick('#settings_save');
});