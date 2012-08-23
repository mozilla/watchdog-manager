"use strict";

self.port.on('password_score', function(data) {
    var scoreTemplate = $('#passwords-score-template').html();
    $('#score-explanation').html(_.template(scoreTemplate,data.score));
});