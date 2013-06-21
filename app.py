import os
import sys
from interpreter import Interpreter
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
	return render_template("index.jinja")

@app.route('/execute', methods=["POST"])
def execute():
    interpreter = Interpreter();
    result = interpreter.interpret(request.json);
    return jsonify(success=result['success'], stdout=result['stdout'], errors=result['errors'])

if __name__ == "__main__":
    app.run(debug=True)
