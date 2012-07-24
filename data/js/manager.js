var count = 0;

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
