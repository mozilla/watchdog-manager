require("passwords_mock").getLogins(
	{
		'onComplete': function(data) {
			console.log(JSON.stringify(data));
		}
	}
);
