set -e
cd "$(cd "`dirname "${BASH_SOURCE[0]}"`" && pwd -P)"
export PATH=../node_modules/.bin:$PATH

budo ../examples/exampleApp.js --port 9902 --live --open --title "AutoReact example" -- -d \
	-t babelify --presets react
