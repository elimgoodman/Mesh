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
    "app",
    "state",
    "models",
    "views"
	], function($, _, Backbone, Marionette, Relational, Mousetrap, Less, Traits, App) {

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