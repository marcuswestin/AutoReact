var autoreact = require('../src/autoreact') // normally: require('autoreact')
var ReactDOM = require('react-dom')
var React = require('react')
var _ = require('lodash')

// State
////////

var State = autoreact.createState({
	username: String,
	currentRoomIndex: Number,
	rooms: Array({
		name: String,
		lastMessage: String,
		messages: Array({
			from: String,
			text: String,
			time: Number
		})
	})
})

var store = {
	setUsername: function(username) {
		State.username = username
	},
	addRoom: function(name) {
		var newRoom = { lastMessage:null, messages:[], name:name }
		State.rooms.push(newRoom)
	},
	addMessage: function(text) {
		var newMessage = { from: State.username, text: text, time: new Date().getTime() }
		State.rooms[State.currentRoomIndex].messages.push(newMessage)
	},
	selectRoom: function(roomIndex) {
		State.currentRoomIndex = roomIndex
	}
}

State.rooms = []
store.addRoom("#General")
store.addRoom("#CatGifs")
store.addRoom("#Random")

// UI
/////

var AppView = autoreact.createClass({
	componentWillMount: function() {
		window.gApp = this
	},
	render: function() {
		return Row(Font(13),
			Col(Flex(0.1, 0, 140), Style({ padding:10, background:'#eee', marginRight:10 }),
				Row(
					Text('Username:', Style({ marginRight:6 })),
					Input({ id:'usernameInput' }, OnChange(this.setUsername))
				),
				Row(Style({ marginTop:6 }),
					Button('Add room', OnClick(this.addRoom)),
				),
				RoomListView()
			),
			Col(Flex(1), Style({ padding:10, background:'steelblue', color:'white' }),
				ChatView()
			)
		)
	},
	addRoom: function() {
		store.addRoom("Another room "+new Date().getTime())
	},
	setUsername: function() {
		store.setUsername(document.getElementById('usernameInput').value)
	}
})

var RoomListView = autoreact.createClass({
	render: function() {
		return Col(
			_.map(State.rooms, (room, roomIndex) => 
				RoomView({ key:room.name, roomIndex:roomIndex })
			)
		)
	}
})

var RoomView = autoreact.createClass({
	render: function() {
		var room = State.rooms[this.props.roomIndex]
		var isCurrent = (this.props.roomIndex == State.currentRoomIndex)
		return Row(Style({ padding:3 }), OnClick(this.selectRoom),
			Row(room.name),
			Row(isCurrent && ' >>')
		)
	},
	selectRoom: function() {
		store.selectRoom(this.props.roomIndex)
	}
})

var ChatView = autoreact.createClass({
	render: function() {
		var room = State.rooms[State.currentRoomIndex]
		if (!room) {
			return Col('No room selected')
		}
		return Col(room.name, OnClick(this.focus),
			_.map(room.messages, (message) =>
				Row({ key:message.time }, Text(message.from + ': ' + message.text))
			),
			Row(
				Input({ key:'messageInput', id:'messageInput' }, OnKeyPress(this.onKeyPress))
			)
		)
	},
	onKeyPress: function(event) {
		if (event.key != 'Enter') { return }
		event.preventDefault()
		var input = document.getElementById('messageInput')
		if (!input.value.trim()) { return }
		store.addMessage(input.value.trim())
		input.value = ''
		setTimeout(this.focus, 0)
	},
	focus: function() {
		document.getElementById('messageInput').focus()
	}
})

// Initialize tags, load fonts, and render app
var tags = require('tags/bootstraps/react-dom-bootstrap')
tags.ExposeGlobals()
var Input = tags.CreateViewFactory('input')
var Button = tags.CreateViewFactory('button')
var Font = tags.LoadFont('Lato', 'n4', { italic: 'i4', bold: 'n7', boldItalic: 'i7' }, function onFontsLoaded() {
	ReactDOM.render(AppView(), document.body.appendChild(document.createElement('div')))
})
