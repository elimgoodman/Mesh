define(["app", "constants"], function(App){
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

        Models.FnParam = Backbone.RelationalModel.compose(Selectable, {
            defaults: {
                type: null,
                name: null
            }
        });

        //FIXME: This is a horrible, horrible hack (params on here)
        Models.FnInfoField = Backbone.RelationalModel.compose(Selectable, {
            defaults: {
                type: null,
                value: null
            },
            relations: [{
                type: Backbone.HasMany,
                key: 'params',
                relatedModel: Models.FnParam,
                reverseRelation: {
                    key: 'field'
                }
            }],
            isParamField: function() {
                return this.get('type') == "PARAMS";
            }
        });

        Models.FnInfo = Backbone.RelationalModel.compose(Selectable, {
            relations: [{
                type: Backbone.HasMany,
                key: 'fields',
                relatedModel: Models.FnInfoField,
                reverseRelation: {
                    key: 'info'
                }
            }]
        });

        Models.Block = Backbone.RelationalModel.compose(Selectable, {
            defaults: {
                type: null
            },
            relations: [{
                type: Backbone.HasMany,
                key: 'statements',
                relatedModel: Models.Statement,
                reverseRelation: {
                    key: 'block'
                }
            }, {
                type: Backbone.HasOne,
                key: 'fn_info',
                relatedModel: Models.FnInfo,
                reverseRelation: {
                    key: 'block'
                }
            }]
        });

        Models.Blocks = Backbone.Collection.extend({
            model: Models.Block
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
});