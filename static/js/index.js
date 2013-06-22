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
        var SelectionKeeper = function (change_cb) {
            this.selected = null;
            this.change_cb = change_cb;
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
                this.postChange(selected);
            },
            get: function () {
                return this.selected;
            },
            unset: function() {
                if(this.selected) {
                    this.selected.set({
                        selected: false
                    });
                }
                this.selected = null;
                this.postChange(null);
            },
            postChange: function(selected) {
                this.trigger('change');

                if(selected && this.change_cb) {
                    this.change_cb(selected);
                }
            }
        });

        Controllers.CurrentStatement = new SelectionKeeper(function(statement){
            if(statement.isPlaceholder()) {
                Controllers.CurrentNode.unset();
            } else {
                var nodes = statement.get("nodes");
                Controllers.CurrentNode.set(nodes.at(0));
            }
        });

        Controllers.CurrentNode = new SelectionKeeper();
    });

    App.module("Cursor", function(Cursor, App, Backbone, Marionette, $, _){

        var getCurrentStatementIndex = function() {
            var current = App.Controllers.CurrentStatement.get();
            return App.Singletons.Statements.indexOf(current);
        }

        var switchStatement = function(is_valid, change_idx) {

            var current_idx = getCurrentStatementIndex();

            if(!is_valid(current_idx)) {
                return;
            }

            var new_idx = change_idx(current_idx);
            var new_one = App.Singletons.Statements.at(new_idx);
            App.Controllers.CurrentStatement.set(new_one);
        }

        var switchNode = function(is_valid, change_idx) {

            var statement = App.Controllers.CurrentStatement.get();
            var nodes = statement.get("nodes");
            var current = App.Controllers.CurrentNode.get();
            var current_idx = nodes.indexOf(current);

            if(!is_valid(current_idx, nodes)) {
                return;
            }

            var new_idx = change_idx(current_idx);
            var new_one = nodes.at(new_idx);
            App.Controllers.CurrentNode.set(new_one);
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
            switchNode(function(current_idx, nodes){
                return current_idx < (nodes.length - 1);
            }, function(current_idx) {
                return current_idx + 1;
            });
        }

        Cursor.previousNode = function() {
            switchNode(function(current_idx, nodes){
                return current_idx > 0;
            }, function(current_idx) {
                return current_idx - 1;
            });
        }

        Cursor.editCurrentNode = function() {
            App.Controllers.CurrentNode.get().switchToEditMode();
        }

        var addStatement = function(idx_xform) {
            var statement = new App.Models.PlaceholderStatement();
            var current_idx = getCurrentStatementIndex();
            App.Singletons.Statements.add(statement, {
                at: idx_xform(current_idx),
                silent: true
            });

            App.Singletons.Statements.trigger('reset');
            App.Controllers.CurrentStatement.set(statement);
        }

        Cursor.addStatementAbove = function() {
            addStatement(function(current_idx) {
                return current_idx;
            });
        };

        Cursor.addStatementBelow = function() {
            addStatement(function(current_idx) {
                return current_idx + 1;
            });
        };
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
            SYMBOL: "SYMBOL",
            PLACEHOLDER: "PLACEHOLDER"
        };

        Constants.Modes = {
            NORMAL: "NORMAL",
            EDIT: "EDIT"
        };
    });

    App.module("Models", function(Models, App, Backbone, Marionette, $, _){

        Models.StatementNode = Backbone.RelationalModel.extend({
            defaults: {
                type: null,
                value: "",
                mode: App.Constants.Modes.NORMAL
            },
            switchToEditMode: function() {
                this.set({mode: App.Constants.Modes.EDIT});
            },
            switchToNormalMode: function() {
                this.set({mode: App.Constants.Modes.NORMAL});
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
            }],
            isPlaceholder: function() {
                return this.get("type") == App.Constants.StatementTypes.PLACEHOLDER;
            },
            reifyAs: function(type) {
                var nodes = this.getDefaultNodesForType(type);

                this.set({
                    type: type
                });

                this.get("nodes").set(nodes);

                this.trigger('reify');
            },
            getDefaultNodesForType: function(type) {
                var nodes;
                switch(type) {
                    case App.Constants.StatementTypes.MUTATE:
                        nodes = [
                            {type: App.Constants.NodeTypes.SYMBOL}
                        ];
                        break;
                    case App.Constants.StatementTypes.DEFINE:
                        nodes = [
                            {type: App.Constants.NodeTypes.SYMBOL},
                            {type: App.Constants.NodeTypes.INT}
                        ];
                        break;
                }

                return nodes;
            }
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

        Models.PlaceholderStatement = Models.Statement.extend({
            defaults: {
                type: App.Constants.StatementTypes.PLACEHOLDER
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

        Views.StatementNode = Backbone.Marionette.ItemView.compose(Selectable, RenderOnChange, {
            template: "#statement-node-tmpl",
            tagName: 'span',
            className: 'statement-node',
            events: {
                'keyup': 'handleKeyup'
            },
            handleKeyup: function(e) {
                if(e.which == 27) {
                    this.model.switchToNormalMode();
                    return;
                }

                var val = $(e.target).val();

                this.model.set({
                    value: val
                }, {
                    silent: true
                });
            },
            onRender: function() {
                //uhh this should probably be conditional?
                this.$('input').focus();
            }
        });

        Views.Statement = Backbone.Marionette.CompositeView.compose(Selectable, RenderOnChange, {
            template: function(model) {
                var selector;
                if(model.type == App.Constants.StatementTypes.PLACEHOLDER) {
                    selector = "#placeholder-statement-tmpl";
                } else {
                    selector = "#statement-tmpl";
                }

                return _.template($(selector).html(), model);
            },
            className: "statement",
            tagName: "li",
            itemView: Views.StatementNode,
            itemViewContainer: ".nodes",
            initialize: function() {
                this.collection = this.model.get('nodes');
            },
            onRender: function() {
                if(this.model.isPlaceholder()) {
                    this.$el.addClass('placeholder');
                } else {
                    this.$el.removeClass('placeholder');
                }
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

        App.statements.show(v);
    });

    //Keyboard commands
    App.addInitializer(function(options){
        Mousetrap.bind("up", function(e){
            e.preventDefault();
            App.Cursor.previousStatement();
        });

        Mousetrap.bind("down", function(e){
            e.preventDefault();
            App.Cursor.nextStatement();
        });

        Mousetrap.bind("left", function(){
            App.Cursor.previousNode();
        });

        Mousetrap.bind("right", function(){
            App.Cursor.nextNode();
        });

        Mousetrap.bind("c", function(){
            App.Cursor.editCurrentNode();
        });

        Mousetrap.bind("o", function(){
            App.Cursor.addStatementBelow();
        });

        Mousetrap.bind("O", function(){
            App.Cursor.addStatementAbove();
        });

        Mousetrap.bind("m", function(){
            var statement = App.Controllers.CurrentStatement.get();
            if(statement.isPlaceholder()) {
                statement.reifyAs(App.Constants.StatementTypes.MUTATE);
            }
        });

        Mousetrap.bind("d", function(){
            var statement = App.Controllers.CurrentStatement.get();
            if(statement.isPlaceholder()) {
                statement.reifyAs(App.Constants.StatementTypes.DEFINE);
            }
        });
    });

    App.start();

    window.App = App;
});