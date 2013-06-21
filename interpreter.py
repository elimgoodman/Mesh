class Interpreter:

    def interpret(self, code):
        statements = code['statements']

        python_code = ""
        stdout = ""
        errors = []

        for statement in statements:
            type = statement['type']
            nodes = statement['nodes']
            if type == 'DEFINE':
                python_code += nodes[0]['value'] + " = " + nodes[1]['value'] + "\n"
            elif type == 'MUTATE':
                if nodes[0]['value'] == "print":
                    python_code += "stdout += str(" + nodes[1]['value'] + ")\n"

        try:
            exec python_code
        except:
            errors.append(str(sys.exc_info()[0]) + ": " + str(sys.exc_info()[1]))

        response = {
            'success': True,
            'stdout': stdout,
            'errors': errors
        }

        return response
