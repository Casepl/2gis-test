var express = require('express');
var app = express();
// var http = require('http').Server(app);
var server = require('http').createServer(app);
var io = require('socket.io')(server);
require('array.prototype.find');

server.listen(3000, function () {
	console.log('Server listening at port 3000');
});

app.use(express.static(__dirname + '/client'));

var userList = [];
var log = [];

function findUserByUserName(userName) {
	return userList.find(function (user) {
		return user.name === userName;
	})
}

io.on('connection', function (socket) {
	var currentUser;

	socket.on('addUser', function (userName) {
		socket.userName = userName;

		if (findUserByUserName(userName) !== undefined) {
			socket.emit('loginError', 'Пользователь с таким именем уже есть в чате');
			return;
		}

		var user = {
			name: userName,
			color: 'hsl(' + (Math.random() * 359) + ', 50%, 65%)'
		};

		userList.push(user);
		socket.emit('login', {
			userList: userList,
			log: log
		});

		log.push({
			type: 'info',
			user: user,
			info: 'userJoined'
		});

		socket.broadcast.emit('userJoined', user);
		console.log('User «' + userName + '» connected');
		currentUser = user;
	});

	socket.on('message', function (text) {
		var message = {
			type: 'message',
			user: currentUser,
			text: text
		};
		log.push(message);
		socket.emit('messageSent', message);
		socket.broadcast.emit('messageAdded', message);
		console.log('User «' + currentUser.name + '» sent message «' + message.text + '»');
	});

	socket.on('userTyping', function(){
		socket.broadcast.emit('userTyping', currentUser);
	});

	socket.on('disconnect', function () {
		if (!currentUser) return;
		var user = findUserByUserName(currentUser.name);
		userList.splice(userList.indexOf(currentUser), 1);
		log.push({
			type: 'info',
			user: user,
			info: 'userLeft'
		});
		socket.broadcast.emit('userLeft', user);
		console.log('User «' + user.name + '» disconnected');
	});
});