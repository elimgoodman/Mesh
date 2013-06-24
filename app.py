from interpreter import Interpreter
from saved_programs import SavedPrograms
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
	return render_template("index.jinja")

#FIXME: placeholder
@app.route('/suggestions')
def methods():
	suggestions = [
		{
			'symbol': 'print',
			'type': 'String',
			'params': [
				{
					'name': 'x',
					'type': 'Int'
				}
			]
		},
		{
			'symbol': 'dummy_method',
			'type': 'String',
			'params': [
				{
					'name': 'x',
					'type': 'Int'
				},
				{
					'name': 'y',
					'type': 'Int'
				}
			]
		}
	]

	return jsonify(suggestions=suggestions)

@app.route('/execute', methods=["POST"])
def execute():
    interpreter = Interpreter();
    result = interpreter.interpret(request.json);
    return jsonify(success=result['success'], stdout=result['stdout'], errors=result['errors'])

@app.route('/saved_programs/<name>', methods=['GET', 'PUT'])
def saved_programs(name):
#    try:
    saved_program = SavedPrograms(name)
#    except Exception as error:
#        return jsonify(success=False, errors=[error])

    if request.method == 'GET':
        result = saved_program.load()
        return jsonify(success=result['success'], data=result['data'], errors=result['errors'])
    else:
        result = saved_program.save(request.form['data'])
        return jsonify(success=result['success'], errors=result['errors'])

if __name__ == "__main__":
    app.run(debug=True)
