$(function(){

    var App = new Backbone.Marionette.Application();

    App.addRegions({
        statements: "#statements",
        stdout: '#stdout'
    });

    App.module("Util", function(Util, App, Backbone, Marionette, $, _){
        Util.postJson = function(url, obj, success) {
            $.ajax({
                type: "POST",
                contentType: "application/json",
                url: url,
                data: JSON.stringify(obj),
                success: success,
                dataType: "json"
            });
        }
    });

    App.module("Constants", function(Constants, App, Backbone, Marionette, $, _){
        Constants.StatementTypes = {
            RETURN: "RETURN",
            MUTATE: "MUTATE",
            BRANCH: "BRANCH",
            LOOP: "LOOP",
            DEFINE: "DEFINE",
            THROW: "THROW"
        };

        Constants.NodeTypes = {
            INT: "INT",
            SYMBOL: "SYMBOL"
        }
    });

    App.module("Models", function(Models, App, Backbone, Marionette, $, _){

        Models.StatementNode = Backbone.RelationalModel.extend({
            defaults: {
                type: null,
                value: ""
            }
        });

        Models.StatementNodes = Backbone.Collection.extend({
            model: Models.StatementNode
        });

        Models.Statement = Backbone.RelationalModel.extend({
            defaults: {
                nodes: new Models.StatementNodes(),
                type: null
            },
            relations: [{
                type: Backbone.HasMany,
                key: 'nodes',
                relatedModel: Models.StatementNode
            }]
        });

        Models.Statements = Backbone.Collection.extend({
            model: Models.Statement
        });

        Models.Result = Backbone.Model.extend({
            defaults: {
                value: ""
            }
        });
    });

    App.module("Singletons", function(Singletons, App, Backbone, Marionette, $, _){
        Singletons.Statements = new App.Models.Statements();
    });

    App.module("SingletonViews", function(SingletonViews, App, Backbone, Marionette, $, _){
        SingletonViews.ExecuteLink = Backbone.View.extend({
            el: "#execute-link",
            events: {
                'click': 'execute'
            },
            execute: function() {
                var obj = {
                    statements: App.Singletons.Statements.toJSON()
                };

                App.Util.postJson("/execute", obj, function(data){
                    var r = new App.Models.Result({
                        value: data.stdout
                    });

                    var v = new App.Views.Result({
                        model: r
                    });

                    App.stdout.show(v);
                });
            }
        });
    });

    App.module("Views", function(Views, App, Backbone, Marionette, $, _){

        Views.StatementNode = Backbone.Marionette.ItemView.extend({
            template: "#statement-node-tmpl",
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
            },
        });

        Views.Statements = Backbone.Marionette.CollectionView.extend({
            itemView: Views.Statement
        });

        Views.Result = Backbone.Marionette.ItemView.extend({
            template: "#result-tmpl"
        });
    });

    var createTestData = function() {
        var nodes = new App.Models.StatementNodes();

        nodes.push(new App.Models.StatementNode({
            type: App.Constants.NodeTypes.SYMBOL,
            value: "a"
        }));
        nodes.push(new App.Models.StatementNode({
            type: App.Constants.NodeTypes.INT,
            value: "1"
        }));

        var print_nodes = new App.Models.StatementNodes();

        print_nodes.push(new App.Models.StatementNode({
            type: App.Constants.NodeTypes.SYMBOL,
            value: "print"
        }));

        print_nodes.push(new App.Models.StatementNode({
            type: App.Constants.NodeTypes.SYMBOL,
            value: "a"
        }));

        App.Singletons.Statements.push(new App.Models.Statement({
            type: App.Constants.StatementTypes.DEFINE,
            nodes: nodes
        }));

        App.Singletons.Statements.push(new App.Models.Statement({
            type: App.Constants.StatementTypes.MUTATE,
            nodes: print_nodes
        }));
    }

    App.addInitializer(function(options){
        createTestData();

        var v = new App.Views.Statements({
            collection: App.Singletons.Statements
        });

        new App.SingletonViews.ExecuteLink();

        App.statements.show(v);
    });

    App.start();

    window.App = App;
});