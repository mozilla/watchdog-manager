var count = 0;

function credentialHTML(credential) {
    return '<tr><td>' + (++count) + '</td><td>' +
        credential.site + '</td><td>' +
        credential.username + '</td><td>' +
        credential.hash + '</td><td>' +
        credential.age + '</td><td>' +
        credential.strength + '</td><td>' +
        '<input type="button" value="Change"></td>' +
        '</tr>';
}
self.port.on('credential', function(data) {
    document.getElementById('password-content').innerHTML += credentialHTML(data);
});
