$(function(){

    var App = new Backbone.Marionette.Application();

    App.addRegions({
        statements: "#statements",
        stdout: '#stdout'
    });

    App.module("Util", function(Util, App, Backbone, Marionette, $, _){

        var ajaxJson = function(type) {
            return function(url, obj, success) {
                $.ajax({
                    type: type,
                    contentType: "application/json",
                    url: url,
                    data: JSON.stringify(obj),
                    success: success,
                    dataType: "json"
                });
            };
        }

        Util.postJson = ajaxJson("POST");
    });

    App.module("State", function(State, App, Backbone, Marionette, $, _){
        var SelectionKeeper = function (change_cb) {
            this.selected = null;
            this.change_cb = change_cb;
        };

        _.extend(SelectionKeeper.prototype, Backbone.Events, {
            set: function (selected) {
                if(this.selected) {
                    this.selected.unselect();
                }
                this.selected = selected;
                this.selected.select();
                this.postChange(selected);
            },
            get: function () {
                return this.selected;
            },
            unset: function() {
                if(this.selected) {
                    this.selected.unselect();
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
        State.SelectedSuggestion = new SelectionKeeper();

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

        var switchFn = function(current_getter, all_getter) {
            return function(is_valid, change_idx) {

                var current_state = current_getter();
                var all = all_getter();

                var current = current_state.get();
                var current_idx = all.indexOf(current);

                if(is_valid(current_idx)) {
                    var new_idx = change_idx(current_idx);
                    var new_one = all.at(new_idx);
                    current_state.set(new_one);
                    return true;
                } else {
                    return false;
                }
            }
        }

        var switchStatement = switchFn(function() {
            return App.State.CurrentStatement;
        }, function() {
            return App.Singletons.Statements;
        });

        var switchSuggestion = switchFn(function() {
            return App.State.SelectedSuggestion;
        }, function() {
            return App.Singletons.Suggestions;
        });

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
            var statement = new App.Models.Statement({
                type: App.Constants.StatementTypes.PLACEHOLDER
            });

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

        Cursor.nextSuggestion = function() {
            return switchSuggestion(function(current_idx){
                return current_idx < (App.Singletons.Suggestions.length - 1);
            }, function(current_idx) {
                return current_idx + 1;
            });
        };

        Cursor.previousSuggestion = function() {
            return switchSuggestion(function(current_idx){
                return current_idx > 0;
            }, function(current_idx) {
                return current_idx - 1;
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
            EXPR: "EXPR",
            SYMBOL: "SYMBOL",
            PLACEHOLDER: "PLACEHOLDER"
        };

        Constants.Modes = {
            NORMAL: "NORMAL",
            EDIT: "EDIT"
        };
    });

    App.module("Models", function(Models, App, Backbone, Marionette, $, _){

        var Selectable = {
            defaults: {
                selected: false
            },
            select: function() {
                this.set({selected: true});
            },
            unselect: function() {
                this.set({selected: false});
            }
        };

        Models.StatementNode = Backbone.RelationalModel.compose(Selectable, {
            defaults: {
                node_type: null,
                expr_type: null,
                value: "",
                mode: App.Constants.Modes.NORMAL,
                suggest: false
            }
        });

        Models.Statement = Backbone.RelationalModel.compose(Selectable, {
            defaults: {
                type: null,
            },
            relations: [{
                type: Backbone.HasMany,
                key: 'nodes',
                relatedModel: Models.StatementNode,
                reverseRelation: {
                    key: 'statement'
                }
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
                            {
                                node_type: App.Constants.NodeTypes.SYMBOL,
                                expr_type: "Mutator",
                                suggest: true
                            }
                        ];
                        break;
                    case App.Constants.StatementTypes.DEFINE:
                        nodes = [
                            {type: App.Constants.NodeTypes.SYMBOL},
                            {
                                node_type: App.Constants.NodeTypes.EXPR

                            }
                        ];
                        break;
                }

                return nodes;
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

        Models.Suggestion = Backbone.Model.compose(Selectable, {
            defaults: {
                symbol: null,
                params: null
            }
        });

        Models.Suggestions = Backbone.Collection.extend({
            model: Models.Suggestion,
            url: '/suggestions',
            parse: function(data) {
                return data.suggestions;
            },
            getSuggestionsForType: function(type) {
                var suggestions = this.filter(function(suggestion) {
                    return true;
                });

                return new Models.Suggestions(suggestions);
            }
        });
    });

    App.module("Singletons", function(Singletons, App, Backbone, Marionette, $, _){
        Singletons.Statements = new App.Models.Statements();
        Singletons.Suggestions = new App.Models.Suggestions();
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
                    if (data.success) {
                        var r = new App.Models.Result({
                            value: data.stdout
                        });

                        var v = new App.Views.Result({
                            model: r
                        });

                        App.stdout.show(v);
                    } else {
                        alert("Execution error: " + data.errors.join("\n"));
                    }
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
                'keydown input': 'handleKeydown',
                'focus input': 'handleFocus',
                'click': 'selectNode'
            },
            handleFocus: function(e) {

                if(this.model.get('suggest')) {

                    var self = this;
                    var suggestions = App.request('get_suggestions_for_type', this.model.get('expr_type'), function(data){
                        App.Singletons.Suggestions.reset(data.suggestions);
                        App.execute('select_suggestion', App.Singletons.Suggestions.at(0));

                        var v = new App.Views.Suggestions({
                            collection: App.Singletons.Suggestions
                        });

                        //FIXME: can I do this with regions?
                        var suggestions = self.$('.suggestion-container');
                        suggestions.html(v.render().el);
                        suggestions.slideDown(75);
                });
                }
            },
            handleKeydown: function(e) {
                var code_to_action = {
                    9: "next_node",
                    13: "use_suggestion",
                    38: "previous_suggestion",
                    40: "next_suggestion"
                };

                if(_.has(code_to_action, e.which)) {
                    e.preventDefault();
                    e.stopPropagation();

                    var action = code_to_action[e.which];
                    App.execute(action);
                }
            },
            handleKeyup: function(e) {
                if(e.which == 27) { //escape
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
            selectNode: function() {
                App.execute('select_node', this.model);
            },
            onRender: function() {
                //FIXME: uhh this should probably be conditional?
                var input = this.$('input');
                var mode = App.request('current_mode');
                var is_edit_mode = (mode == App.Constants.Modes.EDIT);

                if(is_edit_mode) {
                    input.focus();
                    input.select();

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

        Views.Suggestion = Backbone.Marionette.ItemView.compose(RenderOnChange, Selectable, {
            tagName: 'li',
            className: 'suggestion',
            template: "#suggestion-tmpl"
        });

        Views.Suggestions = Backbone.Marionette.CollectionView.extend({
            itemView: Views.Suggestion,
            tagName: 'ul',
            className: 'suggestions'
        });
    });

    var createTestData = function() {

        var s1 = new App.Models.Statement({
            type: "DEFINE"
        });

        var n1 = new App.Models.StatementNode({
            node_type: App.Constants.NodeTypes.SYMBOL,
            value: "a",
            statement: s1
        });

        var n2 = new App.Models.StatementNode({
            node_type: App.Constants.NodeTypes.EXPR,
            value: "1",
            statement: s1
        });

        App.Singletons.Statements.push(s1);

        var s2 = new App.Models.Statement({
            type: "MUTATE"
        });

        var n3 = new App.Models.StatementNode({
            node_type: App.Constants.NodeTypes.SYMBOL,
            expr_type: "Mutator",
            value: "print",
            statement: s2,
            suggest: true
        });

        var n4 = new App.Models.StatementNode({
            node_type: App.Constants.NodeTypes.SYMBOL,
            value: "a",
            statement: s2
        });

        App.Singletons.Statements.push(s2);
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

        Mousetrap.bind("esc", function(){
            App.execute('exit_edit_mode');
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

    App.commands.setHandler("select_node", function(node){
        var statement = node.get('statement');
        App.State.CurrentStatement.set(statement);

        App.State.CurrentNode.set(node);
        App.State.Mode.set(App.Constants.Modes.EDIT);
    });

    App.commands.setHandler("next_suggestion", function(){
        App.Cursor.nextSuggestion();
    });

    App.commands.setHandler("previous_suggestion", function(){
        App.Cursor.previousSuggestion();
    });

    App.commands.setHandler("use_suggestion", function(){
        var node = App.State.CurrentNode.get();

        if(node.get('suggest')) {
            var statement = node.get('statement');
            var suggestion = App.State.SelectedSuggestion.get();
            node.set({value: suggestion.get('symbol')});

            var params = suggestion.get('params');
            _.each(params, function(param){
                var new_node = new App.Models.StatementNode({
                    node_type: param.node_type,
                    expr_type: param.expr_type,
                    statement: statement,
                    suggest: true
                });
            });

            App.Cursor.nextNode();
        }
    });

    App.commands.setHandler("select_suggestion", function(suggestion){
        App.State.SelectedSuggestion.set(suggestion);
    });

    App.commands.setHandler("statement_reified", function(statement){
        App.State.CurrentStatement.set(statement);
        App.State.Mode.set(App.Constants.Modes.EDIT);
    });

    //Req-res
    App.reqres.setHandler("get_suggestions_for_type", function(expr_type, success_cb){
        $.getJSON("/suggestions", {expr_type: expr_type}, success_cb);
    });

    App.reqres.setHandler("current_mode", function(){
        return App.State.Mode.get();
    });

    App.start();

    window.App = App;
});
