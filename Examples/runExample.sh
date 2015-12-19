set -e
cd $(cd `dirname ${BASH_SOURCE[0]}` && pwd -P)
export PATH=$PATH:../node_modules/.bin

budo ./ExampleApp.js --open -- -t es6ify