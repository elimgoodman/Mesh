$(function(){

    var App = new Backbone.Marionette.Application();

    App.addRegions({
    	statements: "#statements"
    });

    App.module("Models", function(Models, App, Backbone, Marionette, $, _){

    	Models.Statement = Backbone.Model.extend({});

    	Models.Statements = Backbone.Collection.extend({
    		model: Models.Statement
    	});
    });

    App.module("Singletons", function(Singletons, App, Backbone, Marionette, $, _){
    	Singletons.Statements = new App.Models.Statements();
    });

    App.module("Views", function(Views, App, Backbone, Marionette, $, _){
    	Views.Statement = Backbone.Marionette.ItemView.extend({
    		template: "#statement-tmpl"
    	});

    	Views.Statements = Backbone.Marionette.CollectionView.extend({
    		itemView: Views.Statement
    	});
    });

    App.addInitializer(function(options){
    	App.Singletons.Statements.push(new App.Models.Statement());
        App.Singletons.Statements.push(new App.Models.Statement());
        App.Singletons.Statements.push(new App.Models.Statement());
        App.Singletons.Statements.push(new App.Models.Statement());
    	var v = new App.Views.Statements({
    		collection: App.Singletons.Statements
    	});

        App.statements.show(v);
    });

    App.start();

    window.App = App;
});