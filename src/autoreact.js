var React = require('react')
var PureRenderMixin = require('react-addons-pure-render-mixin')

import {makeTags, makeGlobalTags} from './tags'
import {assign, defaults, wrapFunction, Class} from './util'

export {DeclareState, View, makeTags, makeGlobalTags}

var viewComponentsByUid = {}
function View(args) {
	wrapFunction(args, 'render', function(oldFn, args) {
		return recordDependenciesDuringRender(this, oldFn, args)
	})
	wrapFunction(args, 'componentWillMount', function(oldFn, args) {
		var viewUid = nextUid()
		this.__autoView = { uid:viewUid }
		viewComponentsByUid[viewUid] = this
		return oldFn.apply(this, args)
	})
	wrapFunction(args, 'componentWillUnmount', function(oldFn, args) {
		discardDependant(this.__autoView.uid)
		delete this.__autoView
		return oldFn.apply(this, args)
	})
	defaults(args, {
		statics: {},
		getInitialState: () => { return {} },
		mixins: []
	})
	
	if (!args.shouldComponentUpdate) {
		args.mixins.push(PureRenderMixin)
	}
	return assign(React.createFactory(React.createClass(args)), args.statics)
}

function DeclareState(schema) {
	var state = { __autoDependants: {} }
	for (var prop in schema) {
		state.__autoDependants[prop] = {}
		var type = schema[prop]
		Object.defineProperty(state, prop, {
			// writable: true,
			configurable: false,
			get: function() {
				recordDependency(state, prop)
				return this._value
			},
			set: function(value) {
				this._value = value
				notifyDependants(state, prop)
			}
		})
	}
	return state
}

var renderingStack = []
function recordDependenciesDuringRender(view, oldFn, args) {
	renderingStack.push(view)
	var result = oldFn.apply(view, args)
	var pop = renderingStack.pop()
	if (pop != view) {
		throw new Error("Bad render order")
	}
	return result
}

function recordDependency(state, name) {
	var view = renderingStack[renderingStack.length - 1]
	state.__autoDependants[name][view.__autoView.uid] = true
}

nextUid._num = 0
function nextUid() {
	nextUid._num += 1
	return 'sub'+nextUid._num
}


function notifyDependants(state, name) {
	var dependants = state.__autoDependants[name]
	for (var viewUid in dependants) {
		var view = viewComponentsByUid[viewUid]
		view.forceUpdate()
	}
}



// var StringProps = {
	
// }

// var NumberProps = {
	
// }

// var ObjectProps = {
	
// }
