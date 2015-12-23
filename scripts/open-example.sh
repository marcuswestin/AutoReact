set -e
cd $(cd `dirname ${BASH_SOURCE[0]}` && pwd -P)
export PATH=../node_modules/.bin:$PATH

budo ../examples/exampleApp.jsx --live --open --title "autoreact example" -- -d \
	--extension .es6 -t babelify --presets react
