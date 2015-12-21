var React = require('react')

import {each, map, assign, isFunction, isArray, isArguments, isObject} from './util'

export function makeGlobalTags(tags) {
	if (!tags) { tags = ['div', 'span', 'input'] }
	var global = this
	each(tags, function(tag) {
		global[tag] = makeTag(tag)
	})
}

export function makeTags(tags) {
	return map(tags, makeTag)
}

export function makeTag(tagName) {
	return function() {
		var props = { style:{} }
		var children = []
		each(arguments, processArg)
		function processArg(val) {
			if (isReactObj(val)) {
				children.push(val)
			} else if (isFunction(val)) {
				processArg(val(props, children))
			} else if (isArray(val) || isArguments(val)) {
				each(val, processArg)
			} else if (isObject(val)) {
				assign(props, val)
			} else if (val !== undefined) {
				children.push(val)
			}
		}
		// return React.createElement(tagName, props, children) // Results in warning "Each child in an array should have a unique "key" prop. Check the renderComponent call using <undefined>. See http://fb.me/react-warning-keys for more information."
		var args = [tagName, props].concat(children)
		return React.createElement.apply(React, args)
	}
}

function isReactObj(arg) {
	return arg && !!(
		arg['$$typeof'] || // v0.14.0
		arg._isReactElement // v0.13.3.0
	)
}
