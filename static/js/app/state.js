define(["app"], function(App){
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
                    this.selected = null;
                    this.postChange(null);
                }
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

            State.CurrentFnInfo.unset();
        });

        State.CurrentBlock = new SelectionKeeper(function(block){
        	var statements = block.get("statements");
        	State.CurrentStatement.set(statements.at(0));
        });

        State.CurrentFnInfo = new SelectionKeeper(function(fn_info){
            State.CurrentStatement.unset();
            State.CurrentNode.unset();
        });

        State.CurrentNode = new SelectionKeeper();
        State.SelectedSuggestion = new SelectionKeeper();

        State.Mode = new StateKeeper();
    });
});