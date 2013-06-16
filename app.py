import os
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

    for statement in statements:
        type = statement['type']
        nodes = statement['nodes']
        if type == 'DEFINE':
            python_code += nodes[0]['value'] + " = " + nodes[1]['value'] + "\n"
        elif type == 'MUTATE':
            if nodes[0]['value'] == "print":
                python_code += "stdout += str(" + nodes[1]['value'] + ")\n"

    print "Python code:\n " + python_code
    exec python_code
    print "stdout: " + stdout

    return jsonify(success=True, stdout=stdout, errors=[])

if __name__ == "__main__":
    app.run(debug=True)
