var ReactDOM = require('react-dom')
var AutoReact = require('../src/autoreact')

var [div, span, input] = AutoReact.makeTags('div,span,input'.split(','))

var Message = {
	From: String,
	Text: String
}
var Room = {
	Name: String,
	Participants: Number,
	LastMessage: String,
	Messages: [Message]
}
var State = AutoReact.DeclareState({
	Username: String,
	Rooms: [Room],
	CurrentRoom: Room
})

var AppView = AutoReact.View({
	render: function(State) {
		return div(
			RoomListView(State.Rooms, State.CurrentRoom),
			ChatView(CurrentRoom)
		)
	}
})

var RoomListView = AutoReact.View({
	render: function(Rooms, CurrentRoom) {
		return _.map(Rooms, function(Room) {
			return RoomView(Room, CurrentRoom)
		})
	}
})

var RoomView = AutoReact.View({
	render: function(Room, CurrentRoom) {
		return div(Room.Name,
			Room.Name == CurrentRoom.Name ? ' (current)' : '',
			{ onclick:function() { State.CurrentRoom = Room } }
		)
	}
})

var ChatView = AutoReact.View({
	render: function(Room) {
		return div(
			_.map(Room.Messages, function(message) {
			
			}),
			input({  })
		)
	}
})

var viewport = document.body.appendChild(document.createElement('div'))
ReactDOM.render(AppView(State), viewport)

console.log("HERE", ChatView)