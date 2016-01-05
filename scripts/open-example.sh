set -e
cd $(cd `dirname ${BASH_SOURCE[0]}` && pwd -P)
export PATH=../node_modules/.bin:$PATH

budo ../examples/exampleApp.jsx --live --open --title "autoreact example" -- -d \
	-t babelify --presets react
