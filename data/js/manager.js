var count = 0;

$(document).ready(function(){
    getCredentials();
    setupUI();
});

/** Given a password, returns a visual representation of its strength */
function strengthHTML(password) {
    var STAR_FILLED = '&#9733;',
        STAR_EMPTY  = '&#9734;';

    var strength = zxcvbn(password);
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
        strengthHTML(credential.password) + '</td><td>' +
        (credential.can_automate ? '<input type="button" class="btnChangePassword" value="Change"></td>' : '</td>') +
        '</tr>';
}

function addCredentials(credentials) {
    credentials.forEach(function(credential) {
        $('#password-table tbody').append($(credentialHTML(credential)));
    });
    $('#password-table').dataTable({
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
            }
            
        ]
    });
}

function setupUI() {
    $(document.body).on('click','.btnChangePassword',function() {
        runAutomationWorker('changePassword',
            $(this).parentsUntil('tbody').find('.table-site').text(), // Site to change password on
            {
                username: $(this).parentsUntil('tbody').find('.table-username').text(), // Username for account
                old_password: $(this).parentsUntil('tbody').find('.table-password').text(), // Username for account
                new_password: 'blah'
            }
        );
    });
}