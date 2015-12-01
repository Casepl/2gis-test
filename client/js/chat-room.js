var chatRoomEnterForm = {
	init: function (chatRoomEl) {
		var that = this;
		that.el = chatRoomEl.querySelector('.enter-form');
		that.inputEl = that.el.querySelector('input');
		that.errorEl = that.el.querySelector('.error');
		that.submitEl = that.el.querySelector('button');

		that._updateSubmitAllowing();
		that.inputEl.addEventListener('input', that._updateSubmitAllowing.bind(that));

		that.el.addEventListener('submit', function(e) {
			e.preventDefault();
			var inputValue = that._getUserName();
			if (inputValue !== '') {
				events.publish('chatRoomEnterForm:enter', inputValue);
			}
		});
	},

	_updateSubmitAllowing: function() {
		if (this._getUserName() === '') {
			this.submitEl.setAttribute('disabled', 'true');
		} else {
			this.submitEl.removeAttribute('disabled');
		}
	},

	_getUserName: function() {
		return this.inputEl.value.trim();
	},

	showError: function (text) {
		this.errorEl.textContent = text;
		this.errorEl.classList.remove('_hidden');
	},

	open: function () {
		this.el.classList.remove('_closed');
	},

	reset: function(){
		this.inputEl.value = '';
		this.errorEl.textContent = '';
		this.errorEl.classList.add('_hidden');
		this._updateSubmitAllowing();
	},

	close: function () {
		this.reset();
		this.el.classList.add('_closed');
	}
};


var chatRoomUserList = {
	init: function (settings) {
		var that = this;
		that.el = settings.chatRoomEl.querySelector('.chat__users');
		that.listEl = that.el.querySelector('.chat__users__list');
		that.userList = settings.userList;
		that.userList.forEach(function (user) {
			that.add(user);
		});
	},

	remove: function (user) {
		var childEls = this.listEl.children;
		if (!childEls) return;
		for (var i = 0, len = childEls.length; i < len; i++) {
			if (childEls[i].dataset.user === user.name) {
				childEls[i].remove();
				break;
			}
		}
	},

	add: function (user) {
		var liEl = document.createElement('li');
		liEl.dataset.user = user.name;
		liEl.style.color = user.color;
		liEl.textContent = user.name;
		this.listEl.appendChild(liEl);
	}
};


var chatRoomLog = {
	_renderObjects: {
		createInfoMessage: function(text) {
			var el = document.createElement('div');
			el.className = 'chat__log__user-info-message';
			el.innerHTML = text;
			return el;
		},

		createMessage: function(user, text){
			var el = document.createElement('div');
			el.className = 'chat__log__message';

			var userNameEl = document.createElement('span');
			userNameEl.className = 'user-name';
			userNameEl.style.color = user.color;

			var textEl = document.createElement('span');
			textEl.className = 'text';

			userNameEl.textContent = user.name + ':';
			textEl.textContent = text;
			el.appendChild(userNameEl);
			el.appendChild(textEl);

			return el;
		}
	},

	init: function(settings) {
		var that = this;
		that.chatRoomEl = settings.chatRoomEl;
		that.el = that.chatRoomEl.querySelector('.chat__log');
		that.log = settings.log;
		that.typingListUserNames = [];

		that.log.forEach(that.add.bind(that));
	},

	_scrollToEnd: function(){
		this.el.scrollTop = this.el.scrollHeight;
	},

	add: function(message) {
		if (message.type === 'message') {
			this.addMessage(message);
		} else if (message.type === 'info') {
			if (message.info === 'userJoined') {
				this.addUserJoinedInfo(message.user);
			} else if (message.info === 'userLeft') {
				this.addUserLeftInfo(message.user);
			}
		}
	},

	addMessage: function(message){
		this.el.appendChild(this._renderObjects.createMessage(message.user, message.text));
		this._scrollToEnd();
	},

	addUserJoinedInfo: function(user) {
		this.el.appendChild(this._renderObjects.createInfoMessage('<span class="user-name" style="color: ' + user.color + '">' + user.name + '</span> вошёл в чат'));
		this._scrollToEnd();
	},

	addUserLeftInfo: function(user) {
		this.el.appendChild(this._renderObjects.createInfoMessage('<span class="user-name" style="color: ' + user.color + '">' + user.name + '</span> покинул чат'));
		this._scrollToEnd();
	},

	showUserTyping: function(user) {
		var that = this;

		if (that.typingListUserNames.indexOf(user.name) !== -1) return;

		var infoEl = that._renderObjects.createInfoMessage('<span class="user-name" style="color: ' + user.color + '">' + user.name + '</span> печатает текст');
		that.el.appendChild(infoEl);
		that.typingListUserNames.push(user.name);
		this._scrollToEnd();

		setTimeout(function(){
			that.typingListUserNames.splice(that.typingListUserNames.indexOf(user.name), 1);
			infoEl.remove();
		}, 3000);
	}
};



var chatRoomMessageForm = {
	init: function(chatRoomEl) {
		var that = this;
		that.el = chatRoomEl.querySelector('.chat__message-form');
		that.textAreaEl = that.el.querySelector('textarea');
		that.submitEl = that.el.querySelector('button');

		that.reset();

		that.textAreaEl.addEventListener('input', function(){
			events.publish('chatRoomMessageForm:typing');
			that._updateSubmitAllowing();
		});

		that.el.addEventListener('submit', function(e) {
			e.preventDefault();
			var inputValue = that._getMessage();
			if (inputValue !== '') {
				events.publish('chatRoomMessageForm:enter', inputValue);
			}
		});
	},

	_updateSubmitAllowing: function() {
		if (this._getMessage() === '') {
			this.submitEl.setAttribute('disabled', 'true');
		} else {
			this.submitEl.removeAttribute('disabled');
		}
	},

	_getMessage: function() {
		return this.textAreaEl.value.trim();
	},

	reset: function() {
		this.textAreaEl.value = '';
		this._updateSubmitAllowing();
	}
};



var chatRoom = {
	init: function () {
		var that = this;

		that.chatRoomEl = document.querySelector('.chat-room');
		that.chatEl = that.chatRoomEl.querySelector('.chat');

		that.modules.enterForm.init(that.chatRoomEl);

		events.subscribe('chatRoomEnterForm:enter', function (userName) {
			socket.emit('addUser', userName);
		});

		socket.on('login', function (settings) {
			that.userList = settings.userList;
			that.log = settings.log;

			that.modules.userList.init({
				chatRoomEl: that.chatRoomEl,
				userList: that.userList
			});

			that.modules.log.init({
				chatRoomEl: that.chatRoomEl,
				log: that.log
			});

			that.modules.messageForm.init(that.chatRoomEl);

			that.modules.enterForm.close();

			events.subscribe('chatRoomMessageForm:enter', function (text) {
				socket.emit('message', text);
			});

			socket.on('messageSent', function(message){
				that.modules.log.addMessage(message);
				that.modules.messageForm.reset();
			});

			events.subscribe('chatRoomMessageForm:typing', function () {
				socket.emit('userTyping');
			});

			socket.on('userJoined', function(user){
				that.modules.userList.add(user);
				that.modules.log.addUserJoinedInfo(user);
			});

			socket.on('userLeft', function(user){
				that.modules.userList.remove(user);
				that.modules.log.addUserLeftInfo(user);
			});

			socket.on('messageAdded', function(message){
				that.modules.log.addMessage(message);
			});

			socket.on('userTyping', function(user){
				that.modules.log.showUserTyping(user);
			});
		});

		socket.on('loginError', function (errorText) {
			that.modules.enterForm.showError(errorText);
		});
	},

	modules: {
		enterForm: chatRoomEnterForm,
		userList: chatRoomUserList,
		log: chatRoomLog,
		messageForm: chatRoomMessageForm
	}

};