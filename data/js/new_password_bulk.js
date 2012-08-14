/*global Password: false */

var passwordSection = $('#set-password');
var passwordTable = $('#password-table');

function rowHTML(site) {
    return '<tr><td>' +
        site.url +
        '</td><td>' +
        site.username +
        '<input class="password" type="password" disabled />' +
        '</td></tr>'
    ;
}

self.port.on('sites', function(sites) {
    console.log('sites');
    sites.forEach(function(site) {
        passwordTable.append(rowHTML(site));
    });
});


/** Generate new password */
$('#generate').click(function() {
    var passwordFields = $('.password');
    passwordFields.each(function(index) {
        var newPassword = (new Password()).toString();

        var passwordField = $(this);
        passwordField.prop('disabled', 'disabled');
        passwordField.val(newPassword);
    });

    passwordSection.show();
});

/** Enable manual entry of passwords */
$('#manual').click(function() {
    var passwordFields = $('.password');
    passwordFields.each(function(index) {
        var passwordField = $(this);
        passwordField.prop('disabled', '');
        passwordField.val('');
    });

    passwordSection.show();
});

/** Toggle visibility of password in field */
var hidden = true;
var unhideButton = $('#unhide');
unhideButton.click(function() {
    var passwordFields = $('.password');
    if(hidden) {
        passwordFields.prop('type', 'text');
        unhideButton.val('Hide the password');
    } else {
        passwordFields.prop('type', 'password');
        unhideButton.val('Show it to me in plain text');
    }

    hidden = ! hidden;
});

/** Submit password */
$('input[type=submit]').click(function() {
    var passwords = $('.password').map(function(index, element) {
        return $(element).val();

    }).get();

    self.port.emit('passwords', passwords); 
});
