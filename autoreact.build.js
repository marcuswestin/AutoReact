(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.DeclareUIState = DeclareUIState;
exports.View = View;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsPureRenderMixin = require('react-addons-pure-render-mixin');

var _reactAddonsPureRenderMixin2 = _interopRequireDefault(_reactAddonsPureRenderMixin);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _util = require('./util');

function DeclareUIState(schema) {
	return newUIState(schema, {});
}

function View(args) {
	return newView(args);
}

// Views
////////

var viewComponentsByUid = {};
var renderingStack = [];
var obsoleteViewUIDs = {}; // Just use !viewComponentsByUID, no?
function newView(args) {
	(0, _util.wrapFunction)(args, 'componentWillMount', function (oldFn, args) {
		this.__autoreactView = {};
		return oldFn.apply(this, args);
	});
	(0, _util.wrapFunction)(args, 'render', function (oldFn, args) {
		var view = this;
		renderingStack.push(view);

		// Remove all current state dependencies for this view
		if (view.__autoreactView.uid) {
			obsoleteViewUIDs[view.__autoreactView.uid] = true;
			delete viewComponentsByUid[view.__autoreactView.uid];
		}
		// Prepare for recording new state dependencies for this view
		view.__autoreactView.uid = nextUid();
		viewComponentsByUid[view.__autoreactView.uid] = view;

		// Record new state dependencies
		var result = oldFn.apply(this, args);

		// New state dependencies have been recorded. Sanity check rendering stack
		var pop = renderingStack.pop();
		if (pop != view) {
			throw new Error("Bad render order");
		}

		// All done!
		return result;
	});
	(0, _util.wrapFunction)(args, 'componentWillUnmount', function (oldFn, args) {
		var view = this;
		obsoleteViewUIDs[view.__autoreactView.uid] = true;
		delete viewComponentsByUid[view.__autoreactView.uid];
		delete this.__autoreactView;
		return oldFn.apply(this, args);
	});

	_lodash2['default'].defaults(args, {
		statics: {},
		getInitialState: function getInitialState() {
			return {};
		},
		mixins: []
	});
	if (!args.shouldComponentUpdate) {
		args.mixins.push(_reactAddonsPureRenderMixin2['default']);
	}
	return _lodash2['default'].assign(_react2['default'].createFactory(_react2['default'].createClass(args)), args.statics);
}

// UIState
//////////

function newUIState(schema, value) {
	if (isAutoState(value)) {
		value = value.__value;
	}

	if (value === undefined || value === null) {
		// TODO: Add and enfore schema nullability?

	} else if (schema == String) {
			(0, _util.assert)(_lodash2['default'].isString(value));
			return value;
		} else if (schema == Number) {
			(0, _util.assert)(_lodash2['default'].isNumber(value));
			return value;
		} else if (schema == Function) {
			(0, _util.assert)(_lodash2['default'].isFunction(value));
			return value;
		} else if (_lodash2['default'].isArray(schema)) {
			(0, _util.assert)(_lodash2['default'].isArray(value));
			var arrayItemSchema = schema[0];
			return newArrayState(arrayItemSchema, value);
		} else if (_lodash2['default'].isPlainObject(schema)) {
			(0, _util.assert)(_lodash2['default'].isPlainObject(value));
			return newObjectState(schema, value);
		} else {
			throw new Error('Unknown schema type');
		}
}

function newArrayState(arrayItemSchema, arr) {
	var result = _lodash2['default'].map(arr, function (itemValue) {
		return newUIState(arrayItemSchema, itemValue);
	});
	// TODO: Instead of preventing mutation, consider notifying parent UIState object of mutation.
	result.push = preventMutation;
	result.pop = preventMutation;
	result.shift = preventMutation;
	result.unshift = preventMutation;
	result.splice = preventMutation;
	result.reverse = preventMutation;
	result.sort = preventMutation;
	return result;
}

function newObjectState(schema, value) {
	var stateObj = {
		__schema: schema,
		__value: null,
		__dependantUIDs: [],
		__isAutoState: true
	};

	stateObj.__value = {};
	_lodash2['default'].each(value, function (propValue, propName) {
		stateObj.__value[propName] = newUIState(schema[propName], propValue); //, name+'.'+propName)
	});
	_lodash2['default'].each(schema, function (_, prop) {
		stateObj.__dependantUIDs[prop] = [];
		var type = schema[prop];
		Object.defineProperty(stateObj, prop, {
			// writable: true,
			configurable: true,
			get: function get() {
				if (renderingStack.length) {
					// We are in a render loop - record that view depends on stateObj[prop]
					var view = renderingStack[renderingStack.length - 1];
					stateObj.__dependantUIDs[prop].push(view.__autoreactView.uid);
				}
				return stateObj.__value[prop];
			},
			set: function set(newPropValue) {
				(0, _util.assert)(!renderingStack.length);
				_sweepDependantsAndScheduleRender(stateObj, prop);
				var propSchema = stateObj.__schema[prop];
				stateObj.__value[prop] = newUIState(propSchema, newPropValue);
			}
		});
	});
	return stateObj;
}

var _scheduledRenders;
function _sweepDependantsAndScheduleRender(stateObj, prop) {
	if (!_scheduledRenders) {
		_scheduledRenders = [];
		setTimeout(_runScheduledRenders, 0);
	}
	_scheduledRenders.push(stateObj.__dependantUIDs[prop]);

	// Descend into nested dependants
	var value = stateObj.__value[prop];
	if (isContainer(value)) {
		_lodash2['default'].each(value, function (_, subProp) {
			_sweepDependantsAndScheduleRender(stateObj, subProp);
		});
	}

	function _runScheduledRenders() {
		var scheduledRenders = _scheduledRenders;
		_scheduledRenders = null;
		_lodash2['default'].each(scheduledRenders, function (dependantsList) {
			_lodash2['default'].each(dependantsList, function (viewUID) {
				if (!obsoleteViewUIDs[viewUID]) {
					var view = viewComponentsByUid[viewUID];
					view.forceUpdate();
				}
			});
		});
	}
}

// MISC UTIL
////////////

function isAutoState(obj) {
	return !!(obj && obj.__isAutoState);
}

function isContainer(obj) {
	return _lodash2['default'].isArray(obj) || _lodash2['default'].isPlainObject(obj);
}

nextUid._num = 0;
function nextUid() {
	nextUid._num += 1;
	return 'sub' + nextUid._num;
}

function preventMutation() {
	throw new Error('Attempted to mutate UI state');
}

},{"./util":3,"lodash":undefined,"react":undefined,"react-addons-pure-render-mixin":undefined}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopExportWildcard(obj, defaults) { var newObj = defaults({}, obj); delete newObj['default']; return newObj; }

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

var _autoreact = require('./autoreact');

_defaults(exports, _interopExportWildcard(_autoreact, _defaults));

},{"./autoreact":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.Class = Class;
exports.wrapFunction = wrapFunction;
exports.assert = assert;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function Class(props) {
	function Constructor() {}
	for (var key in props) {
		Constructor[key] = props[key];
	}
	return Constructor;
}

function wrapFunction(obj, fnName, wrapperFn) {
	var oldFn = obj[fnName] || _lodash2['default'].noop;
	obj[fnName] = function () {
		return wrapperFn.call(this, oldFn, arguments);
	};
}

function assert(ok) {
	if (ok) {
		return;
	}
	throw new Error('Assert failed');
}

},{"lodash":undefined}]},{},[2]);
