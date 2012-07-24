var count = 0;

/** Given a password, returns a visual representation of its strength */
function strengthHTML(password) {
    var STAR_FILLED = '&#9733;',
        STAR_EMPTY  = '&#9734;';

    var score = zxcvbn(password).score;

    var html = '';
    var i;

    for(i = 0; i < score; i++) {
        html += STAR_FILLED;
    }

    for(i = score; i < 4; i++) {
        html += STAR_EMPTY;
    }

    return html;
}

function credentialHTML(credential) {
    return '<tr><td>' + (++count) + '</td><td>' +
        credential.site + '</td><td>' +
        credential.username + '</td><td>' +
        '<img src="' + getDataURLForHash(SHA1(credential.password),70,25) + '"/>' + '</td><td>' +
        credential.age + '</td><td>' +
        strengthHTML(credential.password) + '</td><td>' +
        '<input type="button" value="Change"></td>' +
        '</tr>';
}
self.port.on('credential', function(data) {
    document.getElementById('password-content').innerHTML += credentialHTML(data);
});
