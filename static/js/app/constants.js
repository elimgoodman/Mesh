define(['app'], function(App){
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
            EDIT: "EDIT",
            FN_INFO: "FN_INFO"
        };

        Constants.BlockTypes = {
            MAIN: "MAIN",
            FN: "FN"
        };

        Constants.FnInfoFieldTypes = {
            NAME: "NAME",
            TAKES: "TAKES",
            RETURNS: "RETURNS"
        }
    });
});