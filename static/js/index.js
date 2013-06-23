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

    App.module("State", function(State, App, Backbone, Marionette, $, _){
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

        var StateKeeper = function() {
            this.val = null;
        };

        _.extend(StateKeeper.prototype, Backbone.Events, {
            get: function() {
                return this.val;
            },
            set: function(val) {
                this.val = val;
                this.trigger('change');
            }
        });

        State.CurrentStatement = new SelectionKeeper(function(statement){
            if(statement.isPlaceholder()) {
                State.CurrentNode.unset();
            } else {
                var nodes = statement.get("nodes");
                State.CurrentNode.set(nodes.at(0));
            }
        });

        State.CurrentNode = new SelectionKeeper();

        State.Mode = new StateKeeper();
    });

    App.module("Controllers", function(Controllers, App, Backbone, Marionette, $, _){

        Controllers.Mode = Backbone.Marionette.Controller.extend({
            initialize: function() {
                App.State.Mode.bind('change', this.redrawCurrentNode, this);
            },
            redrawCurrentNode: function() {
                var node = App.State.CurrentNode.get();
                node.trigger('mode_change');
            }
        });
    });

    App.module("Cursor", function(Cursor, App, Backbone, Marionette, $, _){

        var getCurrentStatementIndex = function() {
            var current = App.State.CurrentStatement.get();
            return App.Singletons.Statements.indexOf(current);
        }

        var switchStatement = function(is_valid, change_idx) {

            var current_idx = getCurrentStatementIndex();

            if(is_valid(current_idx)) {
                var new_idx = change_idx(current_idx);
                var new_one = App.Singletons.Statements.at(new_idx);
                App.State.CurrentStatement.set(new_one);
                return true;
            } else {
                return false;
            }

        }

        var switchNode = function(is_valid, change_idx, on_invalid) {

            var statement = App.State.CurrentStatement.get();
            var nodes = statement.get("nodes");
            var current = App.State.CurrentNode.get();
            var current_idx = nodes.indexOf(current);

            if(is_valid(current_idx, nodes)) {
                var new_idx = change_idx(current_idx);
                var new_one = nodes.at(new_idx);
                App.State.CurrentNode.set(new_one);
            } else {
                on_invalid();
            }
        }

        Cursor.nextStatement = function() {
            return switchStatement(function(current_idx){
                return current_idx < (App.Singletons.Statements.length - 1);
            }, function(current_idx) {
                return current_idx + 1;
            });
        };

        Cursor.previousStatement = function() {
            return switchStatement(function(current_idx){
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
            }, function() {
                Cursor.nextStatement();
            });
        }

        Cursor.previousNode = function() {
            switchNode(function(current_idx, nodes){
                return current_idx > 0;
            }, function(current_idx) {
                return current_idx - 1;
            }, function() {
                var success = Cursor.previousStatement();

                if(success) {
                    var nodes = App.State.CurrentStatement.get().get('nodes');
                    App.State.CurrentNode.set(nodes.last());
                }
            });
        }

        var addStatement = function(idx_xform) {
            var statement = new App.Models.PlaceholderStatement();
            var current_idx = getCurrentStatementIndex();
            App.Singletons.Statements.add(statement, {
                at: idx_xform(current_idx),
                silent: true
            });

            App.Singletons.Statements.trigger('reset');
            App.State.CurrentStatement.set(statement);
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
                this.set({
                    type: type
                });

                var nodes = this.getDefaultNodesForType(type);
                this.get("nodes").set(nodes);

                App.execute('statement_reified', this);
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

        SingletonViews.Mode = Backbone.View.extend({
            el: "#mode",
            initialize: function() {
                App.State.Mode.on('change', this.render, this);
            },
            render: function() {
                this.$el.html(App.State.Mode.get());
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
            },
            defaults: {
                selected: false
            }
        }

        var RenderOnChange = {
            initialize: function() {
                this.model.bind('change', this.render, this);
            }
        };

        Views.StatementNode = Backbone.Marionette.ItemView.compose(Selectable, RenderOnChange, {
            initialize: function() {
                this.model.bind("mode_change", this.render, this);
            },
            template: "#statement-node-tmpl",
            tagName: 'span',
            className: 'statement-node',
            events: {
                'keyup input': 'handleKeyup',
                'keydown input': 'handleKeydown'
            },
            handleKeydown: function(e) {
                if (e.which == 9) {
                    e.preventDefault();
                    e.stopPropagation();
                    App.execute('next_node');
                }
            },
            handleKeyup: function(e) {
                if(e.which == 27) { //enter
                    App.execute('exit_edit_mode');
                } else {
                    var val = $(e.target).val();

                    this.model.set({
                        value: val
                    }, {
                        silent: true
                    });
                }

            },
            onRender: function() {
                //FIXME: uhh this should probably be conditional?
                this.$('input').focus();

                var mode = App.request('current_mode');
                if(mode == App.Constants.Modes.EDIT) {
                    this.$el.addClass("edit");
                } else {
                    this.$el.removeClass("edit");
                }
            },
            templateHelpers: {
                isEditMode: function() {
                    return (App.request('current_mode') == App.Constants.Modes.EDIT);
                }
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

        App.State.CurrentStatement.set(App.Singletons.Statements.at(0));

        var v = new App.Views.Statements({
            collection: App.Singletons.Statements
        });

        //TODO: is there a way to auto-instantiate all of the singletons/controllers?
        new App.SingletonViews.ExecuteLink();
        new App.SingletonViews.Mode();
        new App.Controllers.Mode();

        App.statements.show(v);

        App.State.Mode.set(App.Constants.Modes.NORMAL);
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
            App.execute('next_node');
        });

        Mousetrap.bind("c", function(){
            App.State.Mode.set(App.Constants.Modes.EDIT);
        });

        Mousetrap.bind("o", function(){
            App.Cursor.addStatementBelow();
        });

        Mousetrap.bind("O", function(){
            App.Cursor.addStatementAbove();
        });

        Mousetrap.bind("m", function(){
            var statement = App.State.CurrentStatement.get();
            if(statement.isPlaceholder()) {
                statement.reifyAs(App.Constants.StatementTypes.MUTATE);
            }
        });

        Mousetrap.bind("d", function(){
            var statement = App.State.CurrentStatement.get();
            if(statement.isPlaceholder()) {
                statement.reifyAs(App.Constants.StatementTypes.DEFINE);
            }
        });
    });

    //Commands
    App.commands.setHandler("next_node", function(statement){
        App.Cursor.nextNode();
    });

    App.commands.setHandler("exit_edit_mode", function(statement){
        App.State.Mode.set(App.Constants.Modes.NORMAL);
    });

    App.commands.setHandler("statement_reified", function(statement){
        App.State.CurrentStatement.set(statement);
        App.State.Mode.set(App.Constants.Modes.EDIT);
    });

    //Req-res
    App.reqres.setHandler("current_mode", function(){
        return App.State.Mode.get();
    });

    App.start();

    window.App = App;
});