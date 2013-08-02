define(["app"], function(App){
    App.module("State", function(State, App, Backbone, Marionette, $, _){
        var SelectionKeeper = function (on_set, on_unset) {
            this.selected = null;
            this.on_set = on_set || $.noop;
            this.on_unset = on_unset || $.noop;
        };

        _.extend(SelectionKeeper.prototype, Backbone.Events, {
            set: function (selected) {
                if(this.selected) {
                    this.selected.unselect();
                    this.on_unset(this.selected);
                }
                this.selected = selected;
                this.selected.select();
                this.on_set(this.selected);
                this.trigger('change');
            },
            get: function () {
                return this.selected;
            },
            unset: function() {
                if(this.selected) {
                    this.selected.unselect();
                    this.on_unset(this.selected);
                    this.selected = null;
                    this.trigger('change');
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

            State.CurrentFnInfo.unset();
        });

        State.CurrentBlock = new SelectionKeeper(function(block){
        	var statements = block.get("statements");
        	State.CurrentStatement.set(statements.at(0));
        });

        State.CurrentToken = new SelectionKeeper(function(t) {
        });

        State.CurrentFnInfoField = new SelectionKeeper(function(info){
            State.CurrentToken.set(info.getTokens().at(0));
        });

        State.CurrentFnInfo = new SelectionKeeper(function(fn_info){
            State.CurrentStatement.unset();
            State.CurrentNode.unset();

            var field = fn_info.get('fields').at(0);
            State.CurrentFnInfoField.set(field);
        }, function(fn_info){
            State.CurrentFnInfoField.unset();
        });


        State.CurrentNode = new SelectionKeeper();
        State.SelectedSuggestion = new SelectionKeeper();

        State.Mode = new StateKeeper();
    });
});