var AutoReact = require('../src/autoreact') // normally: require('autoreact')
var ReactDOM = require('react-dom')
var React = require('react')
var _ = require('lodash')

// State
////////

var uiState = AutoReact.declareUIState({
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
		uiState.username = username
	},
	addRoom: function(name) {
		var newRoom = { lastMessage:null, messages:[], name:name }
		uiState.rooms.push(newRoom)
	},
	addMessage: function(text) {
		var newMessage = { from: uiState.username, text: text, time: new Date().getTime() }
		uiState.rooms[uiState.currentRoomIndex].messages.push(newMessage)
	},
	selectRoom: function(roomIndex) {
		uiState.currentRoomIndex = roomIndex
	}
}

uiState.rooms = []
store.addRoom("#General")
store.addRoom("#CatGifs")
store.addRoom("#Random")

// UI
/////

class AppView extends AutoReact.Component {
	componentWillMount() {
		super.componentWillMount()
		window.gApp = this
	}
	render() {
		return <div>
			<div>{ this.renderControls() }</div>
			<div>username: { uiState.username || '(none)' }</div>
			<RoomListView/>
			<ChatView/>
		</div>
	}
	renderControls() {
		return <div>Controls:
			<button onClick={this.addRoom}>Add Room</button>
			<button onClick={this.setUsername}>Set username</button>
			<input id='usernameInput' />
		</div>
	}
	addRoom() {
		store.addRoom("Another Room "+new Date().getTime())
	}
	setUsername() {
		store.setUsername(document.getElementById('usernameInput').value)
	}
}

class RoomListView extends AutoReact.Component {
	render() {
		return <div>
			{_.map(uiState.rooms, function(Room, roomIndex) {
				return <RoomView key={Room.name} roomIndex={roomIndex} />
			})}
		</div>
	}
}

class RoomView extends AutoReact.Component {
	render() {
		var Room = uiState.rooms[this.props.roomIndex]
		var isCurrent = (this.props.roomIndex == uiState.currentRoomIndex)
		return <div onClick={this.selectRoom.bind(this)}>
			{Room.name}
			{Room.messages.length ? ' ('+Room.messages.length+')' : ''}
			{isCurrent ? ' (current)' : ''} 
		</div>
	}
	selectRoom() {
		store.selectRoom(this.props.roomIndex)
	}
}

class ChatView extends AutoReact.Component {
	render() {
		var Room = uiState.rooms[uiState.currentRoomIndex]
		if (!Room) {
			return <div>No room selected</div>
		}
		return <div>
			{_.map(Room.messages, (message) =>
				<div key={message.time}>
					{message.from}: {message.text}
				</div>
			)}
			<input id='messageInput' onKeyPress={this.onKeyPress} />
		</div>
	}
	onKeyPress(event) {
		if (event.key != 'Enter') { return }
		event.preventDefault()
		var input = document.getElementById('messageInput')
		store.addMessage(input.value.trim())
		input.value = ''
	}
}

ReactDOM.render(<AppView />, document.body.appendChild(document.createElement('div')))
