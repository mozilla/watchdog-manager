var HASH_COLUMN = 4;
var AGE_COLUMN = 5;
var STATUS_COLUMN = 7;
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
    return '<tr><td>' +
        (credential.can_automate ? '<input class="table-checkbox" type="checkbox" />' : '') +
        '</td><td>' +
        (++count) + '</td><td class="table-site">' +
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
                'aTargets': [HASH_COLUMN]
            },
            // Render password age as a human-readable age string
            {
                'fnRender': function(obj, val) {
                    return ageString(val);
                },
                // Use actual data (before fnRender) to sort column
                'bUseRendered': false,
                'aTargets': [AGE_COLUMN]
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
                'aTargets': [STATUS_COLUMN]
            }
            
        ]
    });
}

/**
 * Returns an object with the following information for the account:
 * - site (URL)
 * - params (username, old_password)
 * - callbacks (success, failure, cancel)
 *
 * NOTE side effect: turns on spinners for all selected rows
 */
function getAccountInfoFromElement(elt) {
    var thisParentTR = $(elt).closest('tr').get()[0];

    // Password for account
    var currentPassword = passwordTable.fnGetData($(thisParentTR).find('.table-password').get()[0]);

    // Username for account
    var username = passwordTable.fnGetData($(thisParentTR).find('.table-username').get()[0]);

    // Site to change password on
    var site = passwordTable.fnGetData($(thisParentTR).find('.table-site').get()[0]);

    // Update table column STATUS_COLUMN (automation button/status) with a spinner.
    passwordTable.fnUpdate('waiting',thisParentTR,STATUS_COLUMN);

    return {
        site: site,
        params: {
            username: username,
            old_password: currentPassword
        },
        callbacks: {
            success: function() {
                passwordTable.fnUpdate('success',thisParentTR,STATUS_COLUMN);
            },
            error: function() {
                passwordTable.fnUpdate('failure',thisParentTR,STATUS_COLUMN);
            },
            cancel: function() {
                passwordTable.fnUpdate('can_automate',thisParentTR,STATUS_COLUMN);
            },
        }
    };
}

function setupUI() {
    $(document.body).on('click','.btnChangePassword',function() {
        var account = getAccountInfoFromElement(this);
        runAutomationWorker('changePassword', account.site, account.params, account.callbacks);
    });

    $('#bulk').click(function() {
        var checked = $('input[class="table-checkbox"]:checked');
        var accounts = checked.map(function(index, element) {
            return getAccountInfoFromElement(element);
        }).get();
        bulkChangePasswords(accounts);
    });
}
