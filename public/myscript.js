$(document).ready(function() {
	var uid;
	var currentedit;
	var currentusers = {};
	var socket = new io.Socket('94.136.43.178', {
		port: 3000,
		rememberTransport: false
	});

	//Change to diff .val to catch insewtions. Backspace catching broken 
	function retarget() {
		$('#target').keypress(function(event) {
			if (event.which == 13) {
				socket.send(JSON.stringify({
					'type': 'newline',
					'data': event.which
				}));
				return false;
			}
			else {
				socket.send(JSON.stringify({
					'type': 'data',
					'data': event.which
				}));
			}
		});
	}

	function newedit(editable) {
		console.log('message id to makeeditable: ' + editable);
		var editbleob = $('#' + editable);
		$('#' + currentedit).show();
		$('#target').remove();
		editbleob.hide();
		editbleob.before('<input type="text" id="target">');
		$('#target').focus();
		$('#target').val(editbleob.text());
		retarget();
		currentedit = editable;
	}
	/*
	function reply(editable) {
		//mash up of newline and new edit
		var editbleob = $('#' + editable);
		$('#' + currentedit).show();
		$('#target').remove();
		//editbleob.hide();
		editbleob.append('<br /><input type="text" id="target" position:relative left:-20px>');
		$('#target').focus();
		$('#target').val(editbleob.text());
		retarget();
		currentedit = editable;
	}
*/
	var content = $('#content'); //content div per forum no need to put forum as clss in each span
	socket.on('connect', function() {
		//setup done on server side
	});

	socket.on('message', function(message) {
		var payload = jQuery.parseJSON(message);

		switch (payload.type) {
		case 'newline':
			content.prepend('<span class=user' + payload.u_id + ' ><br /><b>' + payload.u_id + ':</b><span id=n' + payload.m_id + '></span></span>');
			if (payload.u_id == uid) {
				newedit('n' + payload.m_id);
			}
			else {
				//attach reply listener if not new
			}
			break;
		case 'usercount':
			if (payload.u_id in currentusers) {
				delete currentusers[payload.u_id]; //uodate users gray ou their posts
			}
			else {
				//curently only alows to reply to logged in users this logic should be moved to newlne
				//to add live handlers when history is sent
				currentusers[payload.u_id] = '';

				$('.user' + payload.u_id).live('click', function() {
					socket.send(JSON.stringify({
						'type': 'reply',
						'data': $(this).children('span').attr('id')
					}));
				});
			}
			break;
		case 'user':
			uid = payload.u_id;
			$('.user' + uid).live('click', function() {
				newedit($(this).children('span').attr('id'));
				socket.send(JSON.stringify({
					'type': 'new',
					'm_id': $(this).children('span').attr('id')
				}));
			});
			$('#uid').html(' Your ID: ' + uid);
			$("<style type='text/css'> .user" + uid + "{ color:#f00;} </style>").appendTo("head");
			content.prepend('<span  class=user' + payload.u_id + '><br /><b>' + payload.u_id + ':</b><span id=n' + payload.m_id + '></span><span>');
			newedit('n' + payload.m_id);
			break;
		case 'text':
			$('#n' + payload.m_id).append(payload.data);
			if ('n' + payload.m_id !== currentedit) {
				$('#n' + payload.m_id).stop(true, true).effect("highlight", {},
				400);
			}
		}
	});

	socket.on('disconnect', function() {
		console.log('disconnected');
		content.html("<b>Disconnected!<\/b>");
	});

	socket.connect();

});

