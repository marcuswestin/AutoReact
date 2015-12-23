import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'
import _ from 'lodash'

import { Class, wrapFunction, assert } from './util'

export function DeclareUIState(schema) {
	assert(_.isPlainObject(schema))
	return newUIState(schema, {}, null)
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
	
	_.defaults(args, {
		statics: {},
		getInitialState: function() { return {} },
		mixins: []
	})
	if (!args.shouldComponentUpdate) {
		args.mixins.push(PureRenderMixin)
	}
	return _.assign(React.createFactory(React.createClass(args)), args.statics)
}


// UIState
//////////

function newUIState(schema, value, parent) {
	if (isAutoState(value)) {
		// If a UIState property P is being set to a UIState object V
		// then we don't want the dependants of V to transfer over to be dependant
		// on P. Thus, create a new UIState object with the same underlying
		// value as V.
		value = value.__value
	}
	
	if (value === undefined || value === null) {
		// TODO: Add and enfore schema nullability?
	
	} else if (schema == String) {
		assert(_.isString(value))
		return value
	
	} else if (schema == Number) {
		assert(_.isNumber(value))
		return value
	
	} else if (schema == Function) {
		assert(_.isFunction(value))
		return value
	
	} else if (_.isArray(schema)) {
		assert(_.isArray(value))
		var arrayItemSchema = schema[0]
		return newArrayState(arrayItemSchema, value, parent)
	
	} else if (_.isPlainObject(schema)) {
		assert(_.isPlainObject(value))
		return newObjectState(schema, value, parent)

	} else {
		throw new Error('Unknown schema type')
	}
}

function newArrayState(arrayItemSchema, arr, parent) {
	var arr = _.map(arr, function(itemValue) {
		return newUIState(arrayItemSchema, itemValue, parent)
	})
	bubbleMutation(arr, 'push', arrayItemSchema, parent, function(arr) {
		return [arr.length - 1]
	})
	bubbleMutation(arr, 'pop', arrayItemSchema, parent, function(arr) {
		return []
	})
	bubbleMutation(arr, 'shift', arrayItemSchema, parent, function(arr) {
		return []
	})
	bubbleMutation(arr, 'unshift', arrayItemSchema, parent, function(arr) {
		return [0]
	})
	bubbleMutation(arr, 'splice', arrayItemSchema, parent, function(arr) {
		// Can be improved to look only at arguments to splice and only return affected indices
		return _.map((_, i) => i) // all indices
	})
	bubbleMutation(arr, 'reverse', arrayItemSchema, parent, function(arr) {
		return []
	})
	bubbleMutation(arr, 'sort', arrayItemSchema, parent, function(arr) {
		return _.map((_, i) => i) // all indices
	})
	// TODO: Instead of preventing mutation, consider notifying parent UIState object of mutation.
	// arr.push = preventMutation
	// arr.pop = preventMutation
	// arr.shift = preventMutation
	// arr.unshift = preventMutation
	// arr.splice = preventMutation
	// arr.reverse = preventMutation
	// arr.sort = preventMutation
	return arr
}

function bubbleMutation(arr, fnName, arrayItemSchema, parent, mutatedIndecesFn) {
	var oldFn = arr[fnName]
	arr[fnName] = function() {
		_sweepDependantsAndScheduleRender(parent.stateObj, parent.prop)
		var res = oldFn.apply(arr, arguments)
		_.each(mutatedIndecesFn(arr), function(i) {
			arr[i] = newUIState(arrayItemSchema, arr[i], parent)
		})
		return res
	}
}

function newObjectState(schema, value) {
	var stateObj = {
		__schema: schema,
		__value: null,
		__dependantUIDs: [],
		__isAutoState: true
	}
	
	stateObj.__value = {}
	_.each(value, function(propValue, propName) {
		stateObj.__value[propName] = newUIState(schema[propName], propValue, { stateObj:stateObj, prop:propName })
	})
	_.each(schema, function(_, prop) {
		stateObj.__dependantUIDs[prop] = []
		var type = schema[prop]
		Object.defineProperty(stateObj, prop, {
			get: function() {
				if (renderingStack.length) { // We are in a render loop - record that view depends on stateObj[prop]
					var view = renderingStack[renderingStack.length - 1]
					stateObj.__dependantUIDs[prop].push(view.__autoreactView.uid)
				}
				return stateObj.__value[prop]
			},
			set: function(newPropValue) {
				_sweepDependantsAndScheduleRender(stateObj, prop)
				var propSchema = stateObj.__schema[prop]
				stateObj.__value[prop] = newUIState(propSchema, newPropValue, { stateObj:stateObj, prop:prop })
			}
		})
	})	
	return stateObj
}

var _scheduledRenders
function _sweepDependantsAndScheduleRender(stateObj, prop) {
	assert(!renderingStack.length)
	if (!_scheduledRenders) {
		_scheduledRenders = []
		setTimeout(_runScheduledRenders, 0)
	}
	_scheduledRenders.push(stateObj.__dependantUIDs[prop])
	
	// Descend into nested dependants
	var value = stateObj.__value[prop]
	if (isContainer(value)) {
		_.each(value, function(_, subProp) {
			_sweepDependantsAndScheduleRender(stateObj, subProp)
		})
	}
	
	function _runScheduledRenders() {
		var scheduledRenders = _scheduledRenders
		_scheduledRenders = null
		_.each(scheduledRenders, function(dependantsList) {
			_.each(dependantsList, function(viewUID) {
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
	return _.isArray(obj) || _.isPlainObject(obj)
}

nextUid._num = 0
function nextUid() {
	nextUid._num += 1
	return 'sub'+nextUid._num
}

function preventMutation() {
	throw new Error('Attempted to mutate UI state')
}
