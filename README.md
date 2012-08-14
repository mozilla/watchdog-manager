Watchdog Password Manager
=========================
a better way to see your passwords

Setup
-----
Some code needs to be copied out of git submodules. After cloning, run:

	git submodule update --init
	./copyDeps.sh


jshint
------
We run [jshint](http://www.jshint.com/) on our code to maintain quality. You can run it with the provided .jshintrc files, like so:

    jshint --config data/.jshintrc data/
    jshint --config lib/.jshintrc lib/