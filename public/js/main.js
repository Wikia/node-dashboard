
var socket = io.connect('http://localhost:8089');
socket.emit('my-other-event',{ my: 'data2' });
socket.on('news', function (data) {
	console.log(data);
	socket.emit('my other event', { my: 'data' });
});
