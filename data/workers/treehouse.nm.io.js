var fields = {
    'current': 'input[name=current]',
    'next': 'input[name=new]',
    'verify': 'input[name=verify]' 
};

AutomationHelpers.registerTask('changePassword', function() {
    var params = AutomationHelpers.getParams();
    
    // Assert that the form exists, and looks like we're used to.
    AutomationHelpers.assert($(fields.current).length == 1);
    AutomationHelpers.assert($(fields.next).length == 1);
    AutomationHelpers.assert($(fields.verify).length == 1);

    // Fill in the form
    $(fields.current).val(params['old_password']);
    $(fields.next).val(params['new_password']);
    $(fields.verify).val(params['new_password']);

    $('form').submit();

    AutomationHelpers.addTaskToQueue('verifyChange');
});

AutomationHelpers.registerTask('verifyChange', function() {
    AutomationHelpers.assert(window.location.href === 'http://t.nm.io/password');
    AutomationHelpers.finishAutomation();
});
