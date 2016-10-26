var tags = require('tags/bootstraps/react-dom-bootstrap')
var autoreact = require('autoreact') // normally: require('autoreact')
var ReactDOM = require('react-dom')
var React = require('react')
var _ = require('lodash')


// Load fonts, then start app:
var Font = tags.LoadFont('Lato', 'n4', { italic: 'i4', bold: 'n7', boldItalic: 'i7' }, function onFontsLoaded() {
	var viewport = document.body.appendChild(document.createElement('div'))
	ReactDOM.render(AppView(UIState), viewport)	
})

// App
//////

tags.ExposeGlobals()
var Input = tags.CreateViewFactory('input')
var Button = tags.CreateViewFactory('button')

// State
////////

var UIState = autoreact.DeclareUIState({
	Username: String,
	CurrentRoomIndex: Number,
	Rooms: Array({
		Name: String,
		LastMessage: String,
		Messages: Array({
			From: String,
			Text: String,
			Time: Number
		})
	})
})

var Store = (function() {
	UIState.Rooms = []	
	return {
		setUsername: function(username) {
			UIState.Username = username
		},
		addRoom: function(name) {
			var newRoom = { LastMessage:null, Messages:[], Name:name }
			UIState.Rooms.push(newRoom)
		},
		addMessage: function(text) {
			var newMessage = { From: UIState.Username, Text: text, Time: new Date().getTime() }
			UIState.Rooms[UIState.CurrentRoomIndex].Messages.push(newMessage)
		},
		selectRoom: function(roomIndex) {
			UIState.CurrentRoomIndex = roomIndex
		}
	}
}())

// UI
/////

var AppView = autoreact.ViewComponent({
	componentDidMount: function() {
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
					Button('Add Room', OnClick(this.addRoom)),
				),
				RoomListView()
			),
			Col(Flex(1), Style({ padding:10, background:'steelblue', color:'white' }),
				ChatView()
			)
		)
	},
	addRoom: function() {
		Store.addRoom("A Room "+new Date().getTime())
	},
	setUsername: function() {
		Store.setUsername(document.getElementById('usernameInput').value)
	}
})

var RoomListView = autoreact.ViewComponent({
	render: function() {
		return Col(
			_.map(UIState.Rooms, (Room, roomIndex) => 
				RoomView({ key:Room.Name, roomIndex:roomIndex })
			)
		)
	}
})

var RoomView = autoreact.ViewComponent({
	render: function() {
		var Room = UIState.Rooms[this.props.roomIndex]
		var isCurrent = (this.props.roomIndex == UIState.CurrentRoomIndex)
		return Row(Style({ padding:3 }), OnClick(this.selectRoom),
			Row(Room.Name),
			Row(isCurrent && ' >>')
		)
	},
	selectRoom: function() {
		Store.selectRoom(this.props.roomIndex)
	}
})

var ChatView = autoreact.ViewComponent({
	render: function() {
		var Room = UIState.Rooms[UIState.CurrentRoomIndex]
		if (!Room) {
			return Col('No room selected')
		}
		return Col(Room.Name, OnClick(this.focus),
			_.map(Room.Messages, (message) =>
				Row({ key:message.Time }, Text(message.From + ': ' + message.Text))
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
		Store.addMessage(input.value.trim())
		input.value = ''
		setTimeout(this.focus, 0)
	},
	focus: function() {
		document.getElementById('messageInput').focus()
	}
})
