set -e
cd $(cd `dirname ${BASH_SOURCE[0]}` && pwd -P)
export PATH=../node_modules/.bin:$PATH

browserify ../src/AutoReact.js --outfile ../dist/AutoReact.min.js --no-bundle-external  \
	-t babelify --presets es2015 -t uglifyify
