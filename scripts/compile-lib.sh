set -e
cd "$(cd "`dirname "${BASH_SOURCE[0]}"`" && pwd -P)"

../node_modules/.bin/browserify ../src/autoreact.js --outfile ../dist/autoreact.min.js --no-bundle-external  \
	-t babelify -t uglifyify
