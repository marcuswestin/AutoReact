var {defaults, noop, each, map, assign, isFunction, isArray, isArguments, isObject} = require('lodash')
export {defaults, noop, each, map, assign, isFunction, isArray, isArguments, isObject}

export function Class(props) {
	function Constructor() {}
	for (var key in props) {
		Constructor[key] = props[key]
	}
	return Constructor
}


export function wrapFunction(obj, fnName, wrapperFn) {
	var oldFn = obj[fnName] || noop
	obj[fnName] = function() {
		return wrapperFn.call(this, oldFn, arguments)
	}
}

export function assert(ok) {
	if (ok) { return }
	throw new Error('Assert failed')
}