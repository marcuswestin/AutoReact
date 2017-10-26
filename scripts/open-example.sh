set -e
cd "$(cd "`dirname "${BASH_SOURCE[0]}"`" && pwd -P)"

../node_modules/.bin/budo ../examples/exampleApp.js --port 9902 --live --open --title "autoreact example" -- -d \
	-t babelify --presets react
