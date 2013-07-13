define(["app"], function(App){

	App.module("Views", function(Views, App, Backbone, Marionette, $, _){

		var ClassOnAttribute = function(attribute) {
			return {
				onRender: function() {
					if(this.model.get(attribute)) {
						this.$el.addClass(attribute);
					} else {
						this.$el.removeClass(attribute);
					}
				}
			}
		}

        var Selectable = ClassOnAttribute("selected");

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
            getTemplate: function() {
                if(this.model.get('type') == App.Constants.StatementTypes.PLACEHOLDER) {
                    return "#placeholder-statement-tmpl";
                } else {
                    return "#statement-tmpl";
                }
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

        Views.Block = Backbone.Marionette.CompositeView.compose(Selectable, RenderOnChange, {
            template: "#block-tmpl",
            className: "block",
            tagName: "li",
            itemView: Views.Statement,
            itemViewContainer: ".statements",
            initialize: function() {
                this.collection = this.model.get('statements');
            },
            onRender: function() {
            	this.$el.addClass(this.model.get('type').toLowerCase());
            }
       });

        Views.Statements = Backbone.Marionette.CollectionView.extend({
            itemView: Views.Statement,
            className: 'statements',
            tagName: 'ul'
        });

        Views.Blocks = Backbone.Marionette.CollectionView.extend({
            itemView: Views.Block,
            className: 'blocks',
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

});