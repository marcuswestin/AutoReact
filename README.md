AutoReact
=========

A library that infers UI state dependencies and automatically updates views.


Example
-------

Note the lack of `setState()` and `forceUpdate()`. Yet, it works.

```jsx
var ReactDOM = require('react-dom')
var React = require('react')
var _ = require('lodash')
var AutoReact = require('AutoReact')

var UIState = AutoReact.DeclareUIState({
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

var store = (function() {
	UIState.Rooms = []
	return {
		setUsername: function(username) {
			UIState.Username = username
		},
		addRoom: function(name) {
			UIState.Rooms.push({
				LastMessage:null,
				Messages:[],
				Name:name
			})
		},
		addMessage: function(text) {
			UIState.Rooms[UIState.CurrentRoomIndex].Messages.push({
				From: UIState.Username,
				Text: text,
				Time: new Date().getTime()
			})
		},
		selectRoom: function(roomIndex) {
			UIState.CurrentRoomIndex = roomIndex
		}
	}
}())


var AppView = AutoReact.View({
	componentDidMount: function() {
		window.gApp = this
	},
	render: function() {
		return <div>
			<div>{ this.renderControls() }</div>
			<div>Username: { UIState.Username || '(none)' }</div>
			<RoomListView/>
			<ChatView/>
		</div>
	},
	renderControls: function() {
		return <div>Controls:
			<button onClick={this.addRoom}>Add Room</button>
			<button onClick={this.setUsername}>Set Username</button>
			<input id='usernameInput' />
		</div>
	},
	addRoom: function() {
		store.addRoom("A Room "+new Date().getTime())
	},
	setUsername: function() {
		store.setUsername(document.getElementById('usernameInput').value)
	}
})

var RoomListView = AutoReact.View({
	render: function() {
		return <div>
			{_.map(UIState.Rooms, function(Room, roomIndex) {
				return <RoomView key={Room.Name} roomIndex={roomIndex} />
			})}
		</div>
	}
})

var RoomView = AutoReact.View({
	render: function() {
		var Room = UIState.Rooms[this.props.roomIndex]
		var isCurrent = (this.props.roomIndex == UIState.CurrentRoomIndex)
		return <div onClick={this.selectRoom}>
			{Room.Name} {isCurrent && ' (current)'}
		</div>
	},
	selectRoom: function() {
		store.selectRoom(this.props.roomIndex)
	}
})

var ChatView = AutoReact.View({
	render: function() {
		var Room = UIState.Rooms[UIState.CurrentRoomIndex]
		if (!Room) {
			return <div>No room selected</div>
		}
		return <div>
			{_.map(Room.Messages, (message) =>
				<div key={message.Time}>
					{message.From}: {message.Text}
				</div>
			)}
			<input id='messageInput' onKeyPress={this.onKeyPress} />
		</div>
	},
	onKeyPress: function(event) {
		if (event.key != 'Enter') { return }
		event.preventDefault()
		var input = document.getElementById('messageInput')
		store.addMessage(input.value.trim())
		input.value = ''
	}
})

var viewport = document.body.appendChild(document.createElement('div'))
ReactDOM.render(AppView(UIState), viewport)
```


Misc TODOs
----------

	- [ ] Performance tests
	- [ ] ??? Prevent UIState objects from being passed to components
	- [ ] SHOULD WORK BETTER WITH FLUX:
		- [ ] 		A single store keeps app state.
		- [ ] 		A single UIState keeps UI state.
		- [ ] 		Store updates UIState
	- [ ] Bind a UIState value with an input field
	- [ ] Should the store perhaps grab a mutable copy of UIState?
		- [ ] 		Pro: clarity.
		- [ ] 		Con: prevents easy prototoyping without a store.
		- [ ] 		Pro: can seemingly explain the magic a bit?
