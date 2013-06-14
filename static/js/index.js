$(function(){

    var App = new Backbone.Marionette.Application();

    App.addRegions({
    	statements: "#statements"
    });

    App.module("Models", function(Models, App, Backbone, Marionette, $, _){

        Models.StatementNode = Backbone.Model.extend({});

        Models.StatementNodes = Backbone.Collection.extend({
            model: Models.StatementNode
        });

        Models.Statement = Backbone.Model.extend({
            defaults: {
                nodes: new Models.StatementNodes()
            }
        });

        Models.Statements = Backbone.Collection.extend({
            model: Models.Statement
        });
    });

    App.module("Singletons", function(Singletons, App, Backbone, Marionette, $, _){
    	Singletons.Statements = new App.Models.Statements();
    });

    App.module("Views", function(Views, App, Backbone, Marionette, $, _){
    	Views.Statement = Backbone.Marionette.ItemView.extend({
    		template: "#statement-tmpl",
            className: "statement"
    	});

    	Views.Statements = Backbone.Marionette.CollectionView.extend({
    		itemView: Views.Statement
    	});
    });

    App.addInitializer(function(options){
        var nodes = new App.Models.StatementNodes();

        nodes.push(new App.Models.StatementNode());
        nodes.push(new App.Models.StatementNode());
        nodes.push(new App.Models.StatementNode());

    	App.Singletons.Statements.push(new App.Models.Statement({
            nodes: nodes
        }));

    	var v = new App.Views.Statements({
    		collection: App.Singletons.Statements
    	});

        App.statements.show(v);
    });

    App.start();

    window.App = App;
});