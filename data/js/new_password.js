/*global Password: false */

var passwordSection = $('#set-password');
var passwordField = $('#password');

/** Generate new password */
$('#generate').click(function() {
    var newPassword = (new Password()).toString();

    passwordField.prop('disabled', 'disabled');
    passwordField.val(newPassword);

    passwordSection.show();
});

/** Enable manual entry of passwords */
$('#manual').click(function() {
    passwordField.prop('disabled', '');
    passwordField.val('');

    passwordSection.show();
});

/** Toggle visibility of password in field */
var hidden = true;
var unhideButton = $('#unhide');
unhideButton.click(function() {
    if(hidden) {
        passwordField.prop('type', 'text');
        unhideButton.val('Hide the password');
    } else {
        passwordField.prop('type', 'password');
        unhideButton.val('Show it to me in plain text');
    }

    hidden = ! hidden;
});

/** Submit password */
$('input[type=submit]').click(function() {
   self.port.emit('usePassword', passwordField.val()); 
});
