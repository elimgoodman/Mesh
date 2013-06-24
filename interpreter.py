class Interpreter:

    def __init__(self):
        self.symbol_table = {}
        self.stdout = ""
        self.errors = []

    def get_symbol_value(self, symbol):
        try:
            value = self.symbol_table[symbol]
            return value
        except KeyError:
            self.errors.append('Unknown symbol: ' + symbol)
            raise

    def mesh_define(self, nodes):
        symbol = nodes[0]['value']
        value  = nodes[1]['value']

        self.symbol_table[symbol] = value

    def mesh_mutate(self, nodes):
        if nodes[0]['value'] == "print":
            self.mesh_print(nodes[1:])

    def mesh_print(self, nodes):
        symbol = nodes[0]['value']
        value  = self.get_symbol_value(symbol)
        self.stdout += str(value)

    def interpret(self, code):
        statements = code['statements']

        for statement in statements:
            type = statement['type']
            nodes = statement['nodes']

            try:
                if type == 'DEFINE':
                    self.mesh_define(nodes)
                elif type == 'MUTATE':
                    self.mesh_mutate(nodes)

                response = {
                    'success': True,
                    'stdout': self.stdout,
                    'errors': []
                }
            except:
                response = {
                    'success': False,
                    'stdout': '',
                    'errors': self.errors
                }

        return response
