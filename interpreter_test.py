import unittest
import json
from interpreter import Interpreter

class TestInterpreter(unittest.TestCase):
    def test_print(self):
        data='{"statements":[{"type":"MUTATE","nodes":[{"node_type":"SYMBOL","value":"print"},{"node_type":"INT","value":5}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertTrue(result['success'])
        self.assertEqual(result['stdout'], '5')
        self.assertEqual(result['errors'], [])

    def test_assign_and_print_symbol(self):
        data='{"statements":[{"type":"DEFINE","nodes":[{"node_type":"SYMBOL","value":"a"},{"node_type":"INT","value":"1"}]},{"type":"MUTATE","nodes":[{"node_type":"SYMBOL","value":"print"},{"node_type":"SYMBOL","value":"a"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertTrue(result['success'])
        self.assertEqual(result['stdout'], '1')
        self.assertEqual(result['errors'], [])

    def test_print_expression(self):
        data='{"statements":[{"type":"MUTATE","nodes":[{"node_type":"SYMBOL","value":"print"},{"node_type":"EXPR","value":"5"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertTrue(result['success'])
        self.assertEqual(result['stdout'], '5')
        self.assertEqual(result['errors'], [])

    def test_print_invalid_variable(self):
        data='{"statements":[{"type":"MUTATE","nodes":[{"node_type":"SYMBOL","value":"print"},{"node_type":"SYMBOL","value":"a"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertFalse(result['success'])
        self.assertEqual(result['stdout'], '')
        self.assertEqual(result['errors'], ['Unknown symbol: a'])

    def test_unhandled_method_in_print(self):
        data='{"statements":[{"type":"MUTATE","nodes":[{"node_type":"SYMBOL","value":"print"},{"node_type":"SOMETHING_FUNKY","value":5}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertFalse(result['success'])
        self.assertEqual(result['stdout'], '')
        self.assertEqual(result['errors'], ["In method mesh_print I don't know how to handle a node_type of SOMETHING_FUNKY"])

    def test_unhandled_statement_type(self):
        data='{"statements":[{"type":"WHOA_THERE", "nodes":[]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertFalse(result['success'])
        self.assertEqual(result['stdout'], '')
        self.assertEqual(result['errors'], ["In method main I don't know how to handle a statement type of WHOA_THERE"])

    def test_assign_bad_variable_name(self):
        data='{"statements":[{"type":"DEFINE","nodes":[{"node_type":"SYMBOL","value":"a/a"},{"node_type":"INT","value":"1"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertFalse(result['success'])
        self.assertEqual(result['stdout'], '')
        self.assertEqual(result['errors'], ['The symbol "a/a" isn\'t allowed to contain the character /'])

        data='{"statements":[{"type":"DEFINE","nodes":[{"node_type":"SYMBOL","value":"123a"},{"node_type":"INT","value":"1"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertFalse(result['success'])
        self.assertEqual(result['stdout'], '')
        self.assertEqual(result['errors'], ['The symbol "123a" isn\'t allowed to start with the character 1'])

if __name__ == '__main__':
    unittest.main()
