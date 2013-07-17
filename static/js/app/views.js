define(["app", "constants"], function(App, Constants){

	App.module("Views", function(Views, App, Backbone, Marionette, $, _){

		var ConditionalAttribute = function(attribute) {
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

        var Selectable = ConditionalAttribute("selected");

        var RenderOnChange = {
            initialize: function() {
                this.model.bind('change', this.render, this);
            }
        };

        var RenderOnModeChange = {
            initialize: function() {
                this.model.bind("mode_change", this.render, this);
            }
        };

        var TextInput = {
            handleKeyup: function(e) {
                if(e.which == 27) { //escape
                    App.execute('enter_normal_mode');
                } else {
                    var val = $(e.target).val();

                    this.model.set({
                        value: val
                    }, {
                        silent: true
                    });
                }
            },
            events: {
                'keyup input': 'handleKeyup'
            },
        };

        var SelectOnRenderInMode = function(mode) {
            return {
                onRender: function() {
                    var input = this.$('input');
                    var current_mode = App.request('current_mode');
                    var is_correct_mode = (current_mode == mode);
                    var klass = mode.toLowerCase();

                    if(is_correct_mode) {
                        input.focus();
                        input.select();

                        this.$el.addClass(klass);
                    } else {
                        this.$el.removeClass(klass);
                    }
                }
            }
        };

        Views.StatementNode = Backbone.Marionette.ItemView.compose(
            Selectable,
            RenderOnChange,
            SelectOnRenderInMode(App.Constants.Modes.EDIT),
            TextInput,
            RenderOnModeChange, {

            template: "#statement-node-tmpl",
            tagName: 'span',
            className: 'statement-node',
            events: {
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
            selectNode: function() {
                App.execute('select_node', this.model);
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

        Views.FnParam = Backbone.Marionette.ItemView.compose({
            template: "#fn-param-tmpl",
            tagName: "li",
            className: "fn-param"
        });

        Views.FnInfoField = Backbone.Marionette.CompositeView.compose(
            Selectable,
            RenderOnChange,
            SelectOnRenderInMode(App.Constants.Modes.FN_INFO),
            TextInput,
            RenderOnModeChange, {

            getTemplate: function() {
                if(this.model.isParamField()) {
                    return "#fn-param-field-tmpl";
                } else {
                    return "#fn-info-field-tmpl";
                }
            },
            className: "fn-info-field",
            tagName: "li",
            templateHelpers: {
                isFnInfoMode: function() {
                    return (App.request('current_mode') == App.Constants.Modes.FN_INFO);
                }
            },
            itemView: Views.FnParam,
            itemViewContainer: ".param-container",
            initialize: function() {
                if(this.model.isParamField()) {
                    this.collection = this.model.get('params');
                }
            }
        });

        Views.FnInfo = Backbone.Marionette.CompositeView.compose(Selectable, RenderOnChange, {
            className: 'fn-info',
            events: {
                'click': 'focusOnInfo'
            },
            focusOnInfo: function(e) {
                e.stopPropagation();
                App.execute('focus_on_fn_info', this.model);
            },
            itemView: Views.FnInfoField,
            itemViewContainer: ".fields",
            template: "#fn-info-tmpl",
            initialize: function() {
                this.collection = this.model.get('fields');
            }
        });

        Views.Block = Backbone.Marionette.CompositeView.compose(Selectable, RenderOnChange, {
            getTemplate: function() {
                if(this.model.get('type') == App.Constants.BlockTypes.MAIN) {
                    return "#block-tmpl";
                } else {
                    return "#fn-block-tmpl";
                }
            },
            className: "block",
            tagName: "li",
            itemView: Views.Statement,
            itemViewContainer: ".statements",
            initialize: function() {
                this.collection = this.model.get('statements');
            },
            onRender: function() {
            	this.$el.addClass(this.model.get('type').toLowerCase());

                if(this.model.get('type') == App.Constants.BlockTypes.FN) {
                    var v = new Views.FnInfo({
                        model: this.model.get('fn_info')
                    });

                    this.$(".fn-info-container").html(v.render().el);
                }
            },
            events: {
                'click': 'selectBlock'
            },
            selectBlock: function() {
                App.execute('select_block', this.model);
            },
            templateHelpers: {
                getFnName: function() {
                    return _.find(this.fn_info.fields, function(f){
                        return f.type == App.Constants.FnInfoFieldTypes.NAME;
                    }).value;
                }
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