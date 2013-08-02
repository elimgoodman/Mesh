requirejs.config({
    paths: {
        jquery: '../../js/components/jquery/jquery',
        components: '../../js/components',
        lib: '../../js/app/lib'
    },
    urlArgs: "bust=" + (new Date()).getTime()
});


require([
	"jquery",
	"components/underscore/underscore",
	"components/backbone/backbone",
	"components/backbone.marionette/lib/backbone.marionette",
	"components/backbone-relational/backbone-relational",
	"components/mousetrap/mousetrap",
	"components/less.js/dist/less-1.4.1",
	"lib/backbone.traits",
	], function() {

	var current_step = 0;
	var total_steps = $(".message").length;

	var typeIn = function(text) {
		$("#command-bar").html(text)
	}

	var reveal = function(id) {
		$(id).show();
	}

	var displayCorrectStep = function() {
		$(".message").hide();
		$("#command-bar").html("&nbsp;");
		var step = $($(".message").get(current_step));
		var typein_text = step.find('typein').html();
		var reveal_id = step.find('reveal').html();
		if(typein_text !== undefined) {
			typeIn(typein_text);
		}
		if(reveal_id !== undefined) {
			reveal(reveal_id);
		}
		step.show();
	}

	displayCorrectStep();

	Mousetrap.bind("right", function(){
		if(current_step < total_steps) {
			current_step++;
			displayCorrectStep();
		}
	});

	// Mousetrap.bind("left", function(){
	// 	if(current_step > 0) {
	// 		current_step--;
	// 		displayCorrectStep();
	// 	}
	// });
});