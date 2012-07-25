var count = 0;

$(document).ready(function(){
	getCredentials();
});

function credentialHTML(credential) {
    return '<tr><td>' + (++count) + '</td><td>' +
        credential.site + '</td><td>' +
        credential.username + '</td><td>' +
        SHA1(credential.password) + '</td><td>' +
        credential.age + '</td><td>' +
        credential.strength + '</td><td>' +
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