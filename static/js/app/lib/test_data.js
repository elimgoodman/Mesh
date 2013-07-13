define(["app"], function(App){
	return {
		createTestData: function() {

			var main_block = new App.Models.Block({
				type: "MAIN"
			});

			var s1 = new App.Models.Statement({
				type: "DEFINE",
				block: main_block
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

			var s2 = new App.Models.Statement({
				type: "MUTATE",
				block: main_block
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

			App.Singletons.Blocks.push(main_block);

			var fn_block = new App.Models.Block({
				type: "FN"
			});

			var fn_info = new App.Models.FnInfo({
				name: "returnTwo",
				takes: null,
				returns: "Int",
				block: fn_block
			});

			var s3 = new App.Models.Statement({
				type: "RETURN",
				block: fn_block
			});

			var n5 = new App.Models.StatementNode({
				node_type: App.Constants.NodeTypes.EXPR,
				value: "2",
				statement: s3
			});

			App.Singletons.Blocks.push(fn_block);
		}
	}
})