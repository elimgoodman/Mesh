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

    App.module("Controllers", function(Controllers, App, Backbone, Marionette, $, _){
        var SelectionKeeper = function (postchange) {
            this.selected = null;
            this.postchange = postchange;
        };

        _.extend(SelectionKeeper.prototype, Backbone.Events, {
            set: function (selected) {
                if(this.selected) {
                    this.selected.set({
                        selected: false
                    });
                }
                this.selected = selected;
                this.selected.set({
                    selected: true
                });
                this.trigger('change');

                if(this.postchange) {
                    this.postchange();
                }
            },
            get: function () {
                return this.selected;
            }
        });

        Controllers.CurrentStatement = new SelectionKeeper(function(){
        });

        Controllers.CurrentNode = new SelectionKeeper();
    });

    App.module("Cursor", function(Cursor, App, Backbone, Marionette, $, _){

        var switchStatement = function(is_valid, change_idx) {

            var current = App.Controllers.CurrentStatement.get();
            var current_idx = App.Singletons.Statements.indexOf(current);

            if(!is_valid(current_idx)) {
                return;
            }

            var new_idx = change_idx(current_idx);
            var new_one = App.Singletons.Statements.at(new_idx);
            App.Controllers.CurrentStatement.set(new_one);
        }

        var switchNode = function(is_valid, change_idx) {

            var current = App.Controllers.CurrentNode.get();
            var current_idx = App.Singletons.Statements.indexOf(current);

            if(!is_valid(current_idx)) {
                return;
            }

            var new_idx = change_idx(current_idx);
            var new_one = App.Singletons.Statements.at(new_idx);
            App.Controllers.CurrentStatement.set(new_one);
        }

        Cursor.nextStatement = function() {
            switchStatement(function(current_idx){
                return current_idx < (App.Singletons.Statements.length - 1);
            }, function(current_idx) {
                return current_idx + 1;
            });
        };

        Cursor.previousStatement = function() {
            switchStatement(function(current_idx){
                return current_idx > 0;
            }, function(current_idx) {
                return current_idx - 1;
            });
        }

        Cursor.nextNode = function() {
            //FIXME: START HERE!!
            // switchNode(function(current_idx){
            //     return current_idx < (App.Singletons.Statements.length - 1);
            // }, function(current_idx) {
            //     return current_idx + 1;
            // });
        }

        Cursor.previousNode = function() {
            // switchNode(function(current_idx){
            //     return current_idx > 0;
            // }, function(current_idx) {
            //     return current_idx - 1;
            // });
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
                type: null,
                nodes: new Models.StatementNodes()
            },
            relations: [{
                type: Backbone.HasMany,
                key: 'nodes',
                relatedModel: Models.StatementNode
            }]
        });

        Models.DefineStatement = Models.Statement.extend({
            defaults: {
                type: App.Constants.StatementTypes.DEFINE
            }
        });

        Models.MutateStatement = Models.Statement.extend({
            defaults: {
                type: App.Constants.StatementTypes.MUTATE
            }
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

        SingletonViews.NewStatementLinks = Backbone.View.extend({
            el: "#new-statement-links",
            events: {
                'click #new-define-statement': 'makeNewDefineStatement',
                'click #new-print-statement': 'makeNewPrintStatement'
            },
            makeNewPrintStatement: function() {
                var s = new App.Models.MutateStatement({
                    symbol: new App.Models.StatementNode({
                        type: App.Constants.NodeTypes.SYMBOL,
                        value: "print"
                    }),
                    params: new App.Models.StatementNodes([{
                        //FIXME: this ain't right
                        type: App.Constants.NodeTypes.SYMBOL,
                        value: ""
                    }])
                });
                App.Singletons.Statements.push(s);
            },
            makeNewDefineStatement: function() {
                var s = new App.Models.DefineStatement();
                App.Singletons.Statements.push(s);
            }
        });

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

        var Selectable = {
            onRender: function() {
                if(this.model.get('selected')) {
                    this.$el.addClass("selected");
                } else {
                    this.$el.removeClass("selected");
                }
            }
        }

        var RenderOnChange = {
            initialize: function() {
                this.model.on('change', this.render, this);
            }
        };

        Views.StatementNode = Backbone.Marionette.ItemView.compose(RenderOnChange, {
            template: "#statement-node-tmpl",
            tagName: 'span',
            className: 'statement-node',
            events: {
                'keyup': 'recordChange'
            },
            recordChange: function(e) {
                var val = $(e.target).val();

                this.model.set({
                    value: val
                }, {
                    silent: true
                });
            }
        });

        Views.Statement = Backbone.Marionette.CompositeView.extend({
            template: "#statement-tmpl",
            className: "statement",
            tagName: "li",
            itemView: Views.StatementNode,
            itemViewContainer: ".nodes",
            initialize: function() {
                this.collection = this.model.get('nodes');
            }
        });

        Views.Statements = Backbone.Marionette.CollectionView.extend({
            itemView: Views.Statement,
            className: 'statements',
            tagName: 'ul'
        });

        Views.StatementNodes = Backbone.Marionette.CollectionView.extend({
            itemView: Views.StatementNode,
            className: 'statement-nodes',
            tagName: 'ul'
        });

        Views.Result = Backbone.Marionette.ItemView.extend({
            template: "#result-tmpl"
        });
    });

    var createTestData = function() {

        App.Singletons.Statements.push(new App.Models.DefineStatement({
            nodes: new App.Models.StatementNodes([{
                type: App.Constants.NodeTypes.SYMBOL,
                value: "a"
            },
            {
                type: App.Constants.NodeTypes.INT,
                value: "1"
            }])
        }));

        App.Singletons.Statements.push(new App.Models.MutateStatement({
            nodes: new App.Models.StatementNodes([{
                type: App.Constants.NodeTypes.SYMBOL,
                value: "print"
            },
            {
                type: App.Constants.NodeTypes.SYMBOL,
                value: "a"
            }])
        }));
    }

    App.addInitializer(function(options){
        createTestData();

        App.Controllers.CurrentStatement.set(App.Singletons.Statements.at(0));

        var v = new App.Views.Statements({
            collection: App.Singletons.Statements
        });

        new App.SingletonViews.ExecuteLink();
        new App.SingletonViews.NewStatementLinks();

        App.statements.show(v);
    });

    //Keyboard commands
    App.addInitializer(function(options){
        Mousetrap.bind("up", function(){
            App.Cursor.previousStatement();
        });

        Mousetrap.bind("down", function(){
            App.Cursor.nextStatement();
        });

        Mousetrap.bind("left", function(){
            App.Cursor.previousNode();
        });

        Mousetrap.bind("right", function(){
            App.Cursor.nextNode();
        });
    });

    App.start();

    window.App = App;
});