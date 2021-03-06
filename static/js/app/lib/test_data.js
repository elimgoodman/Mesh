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
				block: fn_block
			});

			var fp = new App.Models.FnInfoField({
				type: "PARAMS",
				value: "",
				info: fn_info
			});

			var f = new App.Models.FnParam({
				type: "Int",
				name: "x",
				field: fp
			});

			var f = new App.Models.FnParam({
				type: "String",
				name: "y",
				field: fp
			});

			var f1 = new App.Models.FnInfoField({
				type: "RETURNS",
				value: "Int",
				info: fn_info
			});

			var f2 = new App.Models.FnInfoField({
				type: "NAME",
				value: "returnTwo",
				info: fn_info
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