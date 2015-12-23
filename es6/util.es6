import _ from 'lodash'

export function Class(props) {
	function Constructor() {}
	for (var key in props) {
		Constructor[key] = props[key]
	}
	return Constructor
}


export function wrapFunction(obj, fnName, wrapperFn) {
	var oldFn = obj[fnName] || _.noop
	obj[fnName] = function() {
		return wrapperFn.call(this, oldFn, arguments)
	}
}

export function assert(ok) {
	if (ok) { return }
	throw new Error('Assert failed')
}
