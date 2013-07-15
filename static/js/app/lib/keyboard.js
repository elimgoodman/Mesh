define(["app"], function(App){
	App.module("Keyboard", function(Keyboard, App, Backbone, Marionette, $, _){
		var _MAP = {
			8: 'backspace',
			9: 'tab',
			13: 'enter',
			16: 'shift',
			17: 'ctrl',
			18: 'alt',
			20: 'capslock',
			27: 'esc',
			32: 'space',
			33: 'pageup',
			34: 'pagedown',
			35: 'end',
			36: 'home',
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down',
			45: 'ins',
			46: 'del',
			91: 'meta',
			93: 'meta',
			224: 'meta'
		},

		_KEYCODE_MAP = {
			106: '*',
			107: '+',
			109: '-',
			110: '.',
			111 : '/',
			186: ';',
			187: '=',
			188: ',',
			189: '-',
			190: '.',
			191: '/',
			192: '`',
			219: '[',
			220: '\\',
			221: ']',
			222: '\''
		};

		var _characterFromEvent = function(e) {

			if (e.type == 'keypress') {
				var character = String.fromCharCode(e.which);
				if (!e.shiftKey) {
					character = character.toLowerCase();
				}

				return character;
			}
			if (_MAP[e.which]) {
				return _MAP[e.which];
			}

			if (_KEYCODE_MAP[e.which]) {
				return _KEYCODE_MAP[e.which];
			}

			return String.fromCharCode(e.which).toLowerCase();
		};

		Keyboard.bindAll = function(keymap) {
			_.each(keymap, function(mode_to_action, key){
				$(document).keydown(function(e){
					var mode = App.request('current_mode');

					if(_.has(mode_to_action, mode)) {
						var character = _characterFromEvent(e);

						if(character == key) {
							var action = mode_to_action[mode];
							action();
							e.preventDefault();
						}
					}
				});
			});
		}
	});

});