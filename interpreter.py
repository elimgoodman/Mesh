class Interpreter:

    symbol_table = {}
    stdout = ""

    def get_symbol_value(self, symbol):
        return self.symbol_table['symbol']

    def mesh_define(self, nodes):
        symbol = nodes[0]['value']
        value  = nodes[1]['value']

        self.symbol_table['symbol'] = value

    def mesh_mutate(self, nodes):
        if nodes[0]['value'] == "print":
            self.mesh_print(nodes[1:])

    def mesh_print(self, nodes):
        symbol = nodes[0]['value']
        value  = self.get_symbol_value(symbol)
        self.stdout += str(value)

    def interpret(self, code):
        statements = code['statements']

        errors = []

        for statement in statements:
            type = statement['type']
            nodes = statement['nodes']

            if type == 'DEFINE':
                self.mesh_define(nodes)
            elif type == 'MUTATE':
                self.mesh_mutate(nodes)

        response = {
            'success': True,
            'stdout': self.stdout,
            'errors': errors
        }

        return response
