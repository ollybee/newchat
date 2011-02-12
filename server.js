/**********************
To do 




 ******************/

var io = require('socket.io');
var redis = require("redis");
var connect = require('connect');
var server = connect.createServer(connect.staticProvider(__dirname + '/public'));
var socket = io.listen(server);

socket.on('connection', function(client) {
	var redisClient = redis.createClient();
	var redisClient2 = redis.createClient();
	redisClient2.incr('uid', function(err, uid) {
	        socket.broadcast('usercount*' + uid);
		var currentmessage = 0;
		redisClient.subscribe('pubsub');

		//below section should be rewritten with cloures. 
		redisClient2.lrange('chatlist', 0, 9, function(err, id) {
			var moo = 9;
			var cow = 9;
			for (i = 9; i >= 0; i--) {
				redisClient2.get('userposts_' + id[i], function(err, nid) {
					client.send('newline*' + nid + '#' + id[moo]);
					redisClient2.get('post_' + id[moo], function(err, message) {
						if (message === null){
						message = '';
						}
						client.send(id[cow] + '*' + message);
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
				client.send('user*' + uid + '#' + spanresponse);
				client.broadcast('newline*' + uid + '#' + spanresponse);
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
			//	console.log(data);
			function log(send) {
				redisClient2.append('post_' + currentmessage, send);
				redisClient2.publish("pubsub", currentmessage + '*' + send);
			}
			var data = message.split('*', 2);
			switch (data[0]) {
			case '13':
				redisClient2.incr('spannum', function(err, spanresponse) {
					currentmessage = spanresponse;
					redisClient2.set('userposts_' + spanresponse, uid);
					redisClient2.lpush('chatlist', currentmessage);
					redisClient2.publish("pubsub", 'newline*' + uid + '#' + spanresponse);
				});
				break;
			case '60':
				log('&lt;');
				break;
			case '62':
				log('&gt;');
				break;
				//backspace currently depreciated until I mov to diffs and JSON
			case '8':
				redisClient2.publish("pubsub", 'del*' + currentmessage);
				break;
			case 'reply':
				console.log(data[1]);
				break;
			case 'new':
				currentmessage = data[1].substr(1);
				break;
			default:
				log(String.fromCharCode(data));

			}
		});

		client.on('disconnect', function() {
			redisClient.quit();
			socket.broadcast('usercount*' + uid);
			redisClient2.quit();
		});
	});
});

server.listen(3000);
console.log('Connect server listening on port 3000');

