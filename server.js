var io = require('socket.io');
var redis = require("redis");
var connect = require('connect');
var server = connect.createServer(connect.staticProvider(__dirname + '/public'));
var socket = io.listen(server);

socket.on('connection', function(client) {
	var redisClient = redis.createClient();
	var PubSubClient = redis.createClient();
	var current_forum = 'firstchat';
	var curent_message = '';

	redisClient.incr('uid', function(err, uid) {
		socket.broadcast(JSON.stringify({
			'type': 'usercount',
			'u_id': uid
		}));
		PubSubClient.subscribe(current_forum);

		//below section should be rewritten with cloures. 
		redisClient.lrange(current_forum, 0, 9, function(err, id) {
			var moo = 9;
			var cow = 9;
			for (i = 9; i >= 0; i--) {
				redisClient.get('userposts_' + id[i], function(err, nid) {
					client.send(JSON.stringify({
						'type': 'newline',
						'm_id': id[moo],
						'u_id': nid
					}));
					redisClient.get('post_' + id[moo], function(err, message) {
						if (message === null) {
							message = '';
						}
						client.send(JSON.stringify({
							'type': 'text',
							'm_id': id[cow],
							'data': message
						}));
						cow--;
					});
					moo--;
				});
			}
		});

		/*Dirty hack below, timeout to make sure history is written before user newline added 
		 * solution is to attatch to dom based on id bubble sort. should be comined with above*/
		redisClient.incr('message_id', function(err, mid) {
			setTimeout(function() {
				client.send(JSON.stringify({
					'type': 'user',
					'u_id': uid,
					'm_id': mid
				}));
				client.broadcast(JSON.stringify({
					'type': 'newline',
					'u_id': uid,
					'm_id': mid
				}));
				current_message = mid;
				redisClient.set('userposts_' + mid, uid);
				redisClient.lpush(current_forum, current_message);
			},
			200);
		});

		PubSubClient.on("message", function(channel, message) {
			client.send(message);
		});

		client.on('message', function(message) {
			function log(send) {
				// does not need to be reassigend of every message
				var outbound = {
					'type': 'text',
					'm_id': current_message,
					'data': send
				};
				redisClient.append('post_' + current_message, send);
				redisClient.publish(current_forum, JSON.stringify(outbound));
			}

			var payload = JSON.parse(message);
			switch (payload.type) {
			case 'newline':
				redisClient.incr('message_id', function(err, mid) {
					current_message = mid;
					redisClient.set('userposts_' + mid, uid);
					redisClient.lpush(current_forum, current_message);
					redisClient.publish(current_forum, JSON.stringify({
						'type': 'newline',
						'u_id': uid,
						'm_id': mid
					}));
				});
				break;
			case 'reply':
				/*work in progres
				console.log(payload.data);
				redisClient.llen(current_forum,
				function(err, forum_index) {
					current_forum = (current_forum + '_' + forum_index);
				});*/
				//create nee message id list forum_index
				//update current forum (for see log funtion)
				//update newline funtion
				//hostory function needs to be updated
				//client side newline needs to be altered
				break;
			case 'new':
				current_message = payload.m_id.substring(1);
				console.log(current_message);
				console.log(payload.m_id);
				break;
			default:
				switch (payload.data) {
				case '60':
					log('&lt;');
					break;
				case '62':
					log('&gt;');
					break;
				default:
					log(String.fromCharCode(payload.data));
				}
			}
		});

		client.on('disconnect', function() {
			redisClient.quit();
			socket.broadcast(JSON.stringify({
				'type': 'usercount',
				'u_id': uid
			}));
			redisClient.quit();
		});
	});
});

server.listen(3000);
console.log('Connect server listening on port 3000');

