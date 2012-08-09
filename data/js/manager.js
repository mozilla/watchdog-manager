var passwordTable;
var count = 0;

$(document).ready(function(){
    getCredentials();
    setupUI();
});

/** Given a password, returns a visual representation of its strength */
function strengthHTML(strength) {
    var STAR_FILLED = '&#9733;',
        STAR_EMPTY  = '&#9734;';

    var score = strength.score;

    var stars = '';
    var i;

    for(i = 0; i < score; i++) {
        stars += STAR_FILLED;
    }

    for(i = score; i < 4; i++) {
        stars += STAR_EMPTY;
    }

    var html = '<span title="Crack time ' + strength.crack_time_display +
        '">' + stars + '</span>';

    return html;
}

function credentialHTML(credential) {
    return '<tr><td>' + (++count) + '</td><td class="table-site">' +
        credential.site + '</td><td class="table-username">' +
        credential.username + '</td><td class="table-password">' +
        credential.password + '</td><td>' +
        credential.lastChanged + '</td><td>' +
        strengthHTML(credential.strength) + '</td><td class="table-automate-button">' +
        (credential.can_automate ? 'can_automate' : '')  + '</td>' +
        '</tr>';
}

function addCredentials(credentials) {
    credentials.forEach(function(credential) {
        $('#password-table tbody').append($(credentialHTML(credential)));
    });
    passwordTable = $('#password-table').dataTable({
        'aoColumnDefs': [
            // Render password as a visual hash
            {
                'fnRender': function(obj, val) {
                    return '<img src="' + getDataURLForHash(SHA1(val),70,25) + '"/>';
                },
                // Use actual data (before fnRender) to sort column
                'bUseRendered': false,
                'aTargets': [3]
            },
            // Render password age as a human-readable age string
            {
                'fnRender': function(obj, val) {
                    return ageString(val);
                },
                // Use actual data (before fnRender) to sort column
                'bUseRendered': false,
                'aTargets': [4]
            },
            // Render automate column as a button, if automation is available for the site.
            // Also includes logic for displaying automation result
            {
                'fnRender': function(obj, val) {
                    if (val == 'can_automate')
                        return '<input type="button" class="btnChangePassword" value="Change">';
                    else if (val == 'success')
                        return '<span class="success">Success!</span>';
                    else if (val == 'failure')
                        return '<span class="failure">Failure!</span>';
                    else if (val == 'waiting')
                        return '<img src="img/spinner.gif"/>';
                    
                        
                    return '';
                },
                // Use actual data (before fnRender) to sort column
                'bUseRendered': false,
                'aTargets': [6]
            }
            
        ]
    });
}

function setupUI() {
    $(document.body).on('click','.btnChangePassword',function() {
        var thisParentTR = $(this).closest('tr').get()[0];
        
        // Password for account
        var currentPassword = passwordTable.fnGetData($(thisParentTR).find('.table-password').get()[0]);
        
        // Username for account
        var username = passwordTable.fnGetData($(thisParentTR).find('.table-username').get()[0]);
        
        // Site to change password on
        var site = passwordTable.fnGetData($(thisParentTR).find('.table-site').get()[0]);
        
        // TODO: replace prompt with something that requires you to confirm a password, with a real password input,
        // and has an option for password generation.
        var newPassword = prompt('Enter your new password.');

        // Update table column 6 (automation button/status) with a spinner.
        passwordTable.fnUpdate('waiting',thisParentTR,6);

        runAutomationWorker('changePassword',
            site,
            {
                username: username,
                old_password: currentPassword,
                new_password: newPassword
            },
            {
                success: function() {
                    passwordTable.fnUpdate('success',thisParentTR,6);
                },
                failure: function() {
                    passwordTable.fnUpdate('failure',thisParentTR,6);
                }
            }
        );
    });
}
