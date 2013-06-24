import unittest
import json
from interpreter import Interpreter

class TestInterpreter(unittest.TestCase):
    def test_assign_and_mutate(self):
        data='{"statements":[{"type":"DEFINE","nodes":[{"type":"SYMBOL","value":"a"},{"type":"INT","value":"1"}]},{"type":"MUTATE","nodes":[{"type":"SYMBOL","value":"print"},{"type":"SYMBOL","value":"a"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertTrue(result['success'])
        self.assertEqual(result['stdout'], '1')
        self.assertEqual(result['errors'], [])

    def test_print_invalid_variable(self):
        data='{"statements":[{"type":"MUTATE","nodes":[{"type":"SYMBOL","value":"print"},{"type":"SYMBOL","value":"a"}]}]}'
        interpreter = Interpreter();
        result = interpreter.interpret(json.loads(data))

        self.assertFalse(result['success'])
        self.assertEqual(result['stdout'], '')
        self.assertEqual(result['errors'], ['Unknown symbol: a'])

if __name__ == '__main__':
    unittest.main()
