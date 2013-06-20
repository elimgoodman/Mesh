(function(){

var compose = function(obj, composed) {
	_.each(obj, function(value, key){
		if(!_.has(composed, key)) {
			composed[key] = value;
		} else {
			if(_.isFunction(value)) {
				var existing_fn = composed[key];
				var new_fn = _.compose(existing_fn, value);
				composed[key] = new_fn;
			} else if(_.isObject(value)) {
				var existing_obj = composed[key];
				var new_obj =  compose(value, existing_obj);
				composed[key] = new_obj;
			} else {
				composed[key] = value;
			}
		}
	});

	return composed;
}

Backbone.Marionette.ItemView.compose = function() {
	var composed = {};
	_.each(arguments, function(obj){
		composed = compose(obj, composed);
	});

	return Backbone.Marionette.ItemView.extend(composed);
}

})();