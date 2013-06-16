import os
import sys
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
	return render_template("index.jinja")

@app.route('/execute', methods=["POST"])
def execute():
    statements = request.json['statements']
    print statements

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

    print "Python code:\n " + python_code
    try:
        exec python_code
    except:
        errors.append(str(sys.exc_info()[0]) + ": " + str(sys.exc_info()[1]))
    print "stdout: " + stdout
    print "errors: " + "\n".join(errors)

    return jsonify(success=True, stdout=stdout, errors=errors)

if __name__ == "__main__":
    app.run(debug=True)
