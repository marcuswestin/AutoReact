var React = require('react')
var PureRenderMixin = require('react-addons-pure-render-mixin')

import {makeTags, makeGlobalTags} from './tags'
export {makeTags, makeGlobalTags}

import { map, uniq, each, assert, assign, defaults, wrapFunction, Class } from './util'
import { isArray, isPlainObject, isString, isNumber, isBool, isFunction } from './util'

export function DeclareUIState(schema) {
	return newUIState(schema, {})
}

export function View(args) {
	return newView(args)
}

// Views
////////

var viewComponentsByUid = {}
var renderingStack = []
var obsoleteViewUIDs = {} // Just use !viewComponentsByUID, no?
function newView(args) {
	wrapFunction(args, 'componentWillMount', function(oldFn, args) {
		this.__autoreactView = {}
		return oldFn.apply(this, args)
	})
	wrapFunction(args, 'render', function(oldFn, args) {
		var view = this
		renderingStack.push(view)
		
		// Remove all current state dependencies for this view
		if (view.__autoreactView.uid) {
			obsoleteViewUIDs[view.__autoreactView.uid] = true
			delete viewComponentsByUid[view.__autoreactView.uid]
		}
		// Prepare for recording new state dependencies for this view
		view.__autoreactView.uid = nextUid()
		viewComponentsByUid[view.__autoreactView.uid] = view
		
		// Record new state dependencies
		var result = oldFn.apply(this, args)
		
		// New state dependencies have been recorded. Sanity check rendering stack
		var pop = renderingStack.pop()
		if (pop != view) { throw new Error("Bad render order") }
		
		// All done!
		return result
	})
	wrapFunction(args, 'componentWillUnmount', function(oldFn, args) {
		var view = this
		obsoleteViewUIDs[view.__autoreactView.uid] = true
		delete viewComponentsByUid[view.__autoreactView.uid]
		delete this.__autoreactView
		return oldFn.apply(this, args)
	})
	
	defaults(args, {
		statics: {},
		getInitialState: function() { return {} },
		mixins: []
	})
	if (!args.shouldComponentUpdate) {
		args.mixins.push(PureRenderMixin)
	}
	return assign(React.createFactory(React.createClass(args)), args.statics)
}


// UIState
//////////

function newUIState(schema, value) {
	if (isAutoState(value)) {
		value = value.__value
	}
	
	if (value === undefined || value === null) {
		// TODO: Add and enfore schema nullability?
	
	} else if (schema == String) {
		assert(isString(value))
		return value
	
	} else if (schema == Number) {
		assert(isNumber(value))
		return value
	
	} else if (schema == Function) {
		assert(isFunction(value))
		return value
	
	} else if (isArray(schema)) {
		assert(isArray(value))
		var arrayItemSchema = schema[0]
		return newArrayState(arrayItemSchema, value)
	
	} else if (isPlainObject(schema)) {
		assert(isPlainObject(value))
		return newObjectState(schema, value)

	} else {
		throw new Error('Unknown schema type')
	}
}

function newArrayState(arrayItemSchema, arr) {
	var result = map(arr, function(itemValue) {
		return newUIState(arrayItemSchema, itemValue)
	})
	// TODO: Instead of preventing mutation, consider notifying parent UIState object of mutation.
	result.push = preventMutation
	result.pop = preventMutation
	result.shift = preventMutation
	result.unshift = preventMutation
	result.splice = preventMutation
	result.reverse = preventMutation
	result.sort = preventMutation
	return result
}

function newObjectState(schema, value) {
	var stateObj = {
		__schema: schema,
		__value: null,
		__dependantUIDs: [],
		__isAutoState: true
	}
	
	stateObj.__value = {}
	each(value, function(propValue, propName) {
		stateObj.__value[propName] = newUIState(schema[propName], propValue) //, name+'.'+propName)
	})
	each(schema, function(_, prop) {
		stateObj.__dependantUIDs[prop] = []
		var type = schema[prop]
		Object.defineProperty(stateObj, prop, {
			// writable: true,
			configurable: true,
			get: function() {
				if (renderingStack.length) { // We are in a render loop - record that view depends on stateObj[prop]
					var view = renderingStack[renderingStack.length - 1]
					stateObj.__dependantUIDs[prop].push(view.__autoreactView.uid)
				}
				return stateObj.__value[prop]
			},
			set: function(newPropValue) {
				assert(!renderingStack.length)
				_sweepDependantsAndScheduleRender(stateObj, prop)
				var propSchema = stateObj.__schema[prop]
				stateObj.__value[prop] = newUIState(propSchema, newPropValue)
			}
		})
	})	
	return stateObj
}

var _scheduledRenders
function _sweepDependantsAndScheduleRender(stateObj, prop) {
	if (!_scheduledRenders) {
		_scheduledRenders = []
		setTimeout(_runScheduledRenders, 0)
	}
	_scheduledRenders.push(stateObj.__dependantUIDs[prop])
	
	// Descend into nested dependants
	var value = stateObj.__value[prop]
	if (isContainer(value)) {
		each(value, function(_, subProp) {
			_sweepDependantsAndScheduleRender(stateObj, subProp)
		})
	}
	
	function _runScheduledRenders() {
		var scheduledRenders = _scheduledRenders
		_scheduledRenders = null
		each(scheduledRenders, function(dependantsList) {
			each(dependantsList, function(viewUID) {
				if (!obsoleteViewUIDs[viewUID]) {
					var view = viewComponentsByUid[viewUID]
					view.forceUpdate()
				}
			})
		})
	}
}

// MISC UTIL
////////////

function isAutoState(obj) {
	return !!(obj && obj.__isAutoState)
}

function isContainer(obj) {
	return isArray(obj) || isPlainObject(obj)
}

nextUid._num = 0
function nextUid() {
	nextUid._num += 1
	return 'sub'+nextUid._num
}

function preventMutation() {
	throw new Error('Attempted to mutate UI state')
}
