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
    return jsonify(success=True, stdout="mock result", errors=[])

if __name__ == "__main__":
    app.run(debug=True)
