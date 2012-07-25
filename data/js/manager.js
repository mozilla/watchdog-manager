var count = 0;

$(document).ready(function(){
	getCredentials();
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
>>>>>>> fd259745c6fa9b5eff527d7ed73c9da62badea5b

function credentialHTML(credential) {
    return '<tr><td>' + (++count) + '</td><td>' +
        credential.site + '</td><td>' +
        credential.username + '</td><td>' +
        SHA1(credential.password) + '</td><td>' +
        ageString(credential.lastChanged) + '</td><td>' +
        strengthHTML(credential.password) + '</td><td>' +
        '<input type="button" value="Change"></td>' +
        '</tr>';
}

function addCredentials(credentials) {
	credentials.forEach(function(credential) {
	    $('#password-table tbody').append($(credentialHTML(credential)));
	});
	$('#password-table').dataTable({
		'aoColumnDefs': [
			{
				'fnRender': function(obj, val) {
					return '<img src="' + getDataURLForHash(val,70,25) + '"/>';
				},
				'aTargets': [3]
			}
		]
	});
}
