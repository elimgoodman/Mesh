import re

class Error(Exception):
    """Base class for exceptions in this module."""
    def __init__(self, interpreter):
        self.interpreter = interpreter

class UndefinedSymbolError(Error):
    def __init__(self, interpreter, symbol):
        Error.__init__(self, interpreter)
        interpreter.add_error('Unknown symbol: ' + symbol)

class SymbolNameError(Error):
    def __init__(self, interpreter, symbol, bad_character, verb):
        Error.__init__(self, interpreter)
        interpreter.add_error('The symbol "' + symbol + '" isn\'t allowed to ' + verb + ' the character ' + bad_character)

class UnhandledExpressionError(Error):
    def __init__(self, interpreter, symbol):
        Error.__init__(self, expression)
        interpreter.add_error('I don\'t know how to evaluate this expression: ' + expression)

class UnhandledMethodError(Error):
    """For functionality that we don't know how to handle"""
    def __init__(self, interpreter, method_name, error):
        Error.__init__(self, interpreter)
        interpreter.add_error('In method ' + method_name + ' I don\'t know how to handle ' + error)

class Interpreter:

    def __init__(self):
        self.symbol_table = {}
        self.output = ""
        self.errors = []

    def add_error(self, error):
        self.errors.append(error)

    def get_symbol_value(self, symbol):
        try:
            value = self.symbol_table[symbol]
            return value
        except KeyError:
            raise UndefinedSymbolError(self, symbol)

    def evaluate_expression(self, expression):
        if re.match("\d+", expression):
            return expression
        raise UnhandledExpressionError(self, expression)

    def mesh_define(self, nodes):
        symbol = nodes[0]['value']
        match = re.search("^[^a-zA-Z_]", symbol)
        if match:
            raise SymbolNameError(self, symbol, match.group(0), "start with")
        match = re.search("[^a-zA-Z_0-9]", symbol)
        if match:
            raise SymbolNameError(self, symbol, match.group(0), "contain")

        value  = nodes[1]['value']

        self.symbol_table[symbol] = value

    def mesh_mutate(self, nodes):
        if nodes[0]['value'] == "print":
            self.mesh_print(nodes[1:])

    def mesh_print(self, nodes):
        node_type = nodes[0]['node_type']
        if node_type == 'SYMBOL':
            symbol = nodes[0]['value']
            value  = self.get_symbol_value(symbol)
        elif node_type == 'INT':
            value = nodes[0]['value']
        elif node_type == 'EXPR':
            value = self.evaluate_expression(nodes[0]['value'])
        else:
            raise UnhandledMethodError(self, "mesh_print", "a node_type of " + str(node_type))
        self.output += str(value)

    def interpret(self, code):
        statements = code['statements']

        for statement in statements:
            statement_type = statement['type']
            nodes = statement['nodes']

            try:
                if statement_type == 'DEFINE':
                    self.mesh_define(nodes)
                elif statement_type == 'MUTATE':
                    self.mesh_mutate(nodes)
                else:
                    raise UnhandledMethodError(self, "main", "a statement type of " + str(statement_type))

                response = {
                    'success': True,
                    'stdout': self.output,
                    'errors': []
                }
            except (UndefinedSymbolError, UnhandledMethodError, SymbolNameError):
                response = {
                    'success': False,
                    'stdout': '',
                    'errors': self.errors
                }
            except:
                raise

        return response
