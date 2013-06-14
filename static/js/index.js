$(function(){

    var App = new Backbone.Marionette.Application();

    App.addRegions({
    	statements: "#statements"
    });

    App.module("Models", function(Models, App, Backbone, Marionette, $, _){

        Models.StatementNode = Backbone.Model.extend({
            defaults: {
                type: null,
                value: ""
            }
        });

        Models.StatementNodes = Backbone.Collection.extend({
            model: Models.StatementNode
        });

        Models.Statement = Backbone.Model.extend({
            defaults: {
                nodes: new Models.StatementNodes(),
                type: null
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

        Views.StatementNode = Backbone.Marionette.ItemView.extend({
            template: "#statement-node-tmpl",
            templateHelpers: {
                getValue: function() {
                    if(this.type == "ASSIGN") {
                        return "->";
                    } else if(this.type == "PRINT") {
                        return "print";
                    }
                    else {
                        return this.value;
                    }
                }
            },
            tagName: 'li',
            className: 'statement-node'
        });

    	Views.Statement = Backbone.Marionette.CompositeView.extend({
    		template: "#statement-tmpl",
            className: "statement",
            itemViewContainer: ".nodes",
            itemView: Views.StatementNode,
            initialize: function() {
                this.collection = this.model.get('nodes');
            }
    	});

    	Views.Statements = Backbone.Marionette.CollectionView.extend({
    		itemView: Views.Statement
    	});
    });

    var createTestData = function() {
        var nodes = new App.Models.StatementNodes();

        nodes.push(new App.Models.StatementNode({
            type: "INT",
            value: "1"
        }));
        nodes.push(new App.Models.StatementNode({
            type: "ASSIGN",
        }));
        nodes.push(new App.Models.StatementNode({
            type: "SYMBOL",
            value: "a"
        }));

        var print_nodes = new App.Models.StatementNodes();

        print_nodes.push(new App.Models.StatementNode({
            type: "PRINT"
        }));

        print_nodes.push(new App.Models.StatementNode({
            type: "SYMBOL",
            value: "a"
        }));

        App.Singletons.Statements.push(new App.Models.Statement({
            type: "ASSIGN",
            nodes: nodes
        }));

        App.Singletons.Statements.push(new App.Models.Statement({
            type: "PRINT",
            nodes: print_nodes
        }));
    }

    App.addInitializer(function(options){
        createTestData();
    	var v = new App.Views.Statements({
    		collection: App.Singletons.Statements
    	});

        App.statements.show(v);
    });

    App.start();

    window.App = App;
});