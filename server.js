var io = require('socket.io');
var redis = require("redis");
var connect = require('connect');
var server = connect.createServer(connect.staticProvider(__dirname + '/public'));
var socket = io.listen(server);

socket.on('connection', function(client) {
	var redisClient = redis.createClient();
	var redisClient2 = redis.createClient();
	redisClient2.incr('uid', function(err, uid) {
		socket.broadcast(JSON.stringify({
			'type': 'usercount',
			'u_id': uid
		}));
		redisClient.subscribe('pubsub');

		//below section should be rewritten with cloures. 
		redisClient2.lrange('chatlist', 0, 9, function(err, id) {
			var moo = 9;
			var cow = 9;
			for (i = 9; i >= 0; i--) {
				redisClient2.get('userposts_' + id[i], function(err, nid) {
					client.send(JSON.stringify({
						'type': 'newline',
						'm_id': id[moo],
						'u_id': nid
					}));
					redisClient2.get('post_' + id[moo], function(err, message) {
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
		redisClient2.incr('spannum', function(err, spanresponse) {
			setTimeout(function() {
				client.send(JSON.stringify({
					'type': 'user',
					'u_id': uid,
					'm_id': spanresponse
				}));
				client.broadcast(JSON.stringify({
					'type': 'newline',
					'u_id': uid,
					'm_id': spanresponse
				}));
				currentmessage = spanresponse;
				redisClient2.set('userposts_' + spanresponse, uid);
				redisClient2.lpush('chatlist', currentmessage);
			},
			200);
		});

		redisClient.on("message", function(channel, message) {
			client.send(message);
		});

		client.on('message', function(message) {
			function log(send) {
				// does not need to be reassigend of every message
				var outbound = {
					'type': 'text',
					'm_id': currentmessage,
					'data': send
				};
				redisClient2.append('post_' + currentmessage, send);
				redisClient2.publish("pubsub", JSON.stringify(outbound));
			}

			var payload = JSON.parse(message);
			switch (payload.type) {
			case 'newline':
				redisClient2.incr('spannum', function(err, spanresponse) {
					currentmessage = spanresponse;
					redisClient2.set('userposts_' + spanresponse, uid);
					redisClient2.lpush('chatlist', currentmessage);
					redisClient2.publish("pubsub", JSON.stringify({
						'type': 'newline',
						'u_id': uid,
						'm_id': spanresponse
					}));
				});
				break;
			case 'reply':
				//work in progres
				console.log(payload.data);
				//create nee message id list forum_index
				//update current forum (for see log funtion)
				//update newline funtion
				//hostory function needs to be updated
				//client side newline needs to be altered
				break;
			case 'new':
				currentmessage = payload.m_id.substring(1);
				console.log(currentmessage);
				console.log(payload.m_id);
				break;
			default:
				switch (payload.data){
			case '60':
				log('&lt;');
				break;
			case '62':
				log('&gt;');
				break;
			default:
				log(String.fromCharCode(payload.data));
			}}
		});

		client.on('disconnect', function() {
			redisClient.quit();
			socket.broadcast(JSON.stringify({
				'type': 'usercount',
				'u_id': uid
			}));
			redisClient2.quit();
		});
	});
});

server.listen(3000);
console.log('Connect server listening on port 3000');

