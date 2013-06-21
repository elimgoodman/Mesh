import string
import os

# for testing with app.py:
# curl -i -H "Accept: application/json" -X PUT -d "data=9999" http://localhost:5000/saved_programs/dan
# curl http://localhost:5000/saved_programs/dan

class SavedPrograms:

    SAVED_PROGRAMS_DIR = '/tmp/saved_programs'
    VALID_CHARS = "-_.%s%s" % (string.ascii_letters, string.digits)

    def validateName(self, name):
        if not name:
            raise Exception('"name" parameter is empty')
     
        for c in name:
            if c not in SavedPrograms.VALID_CHARS:
                raise Exception('"name" contains invalid characters')

    def __init__(self, name, directory=SAVED_PROGRAMS_DIR):

        if not os.path.exists(directory):
            os.makedirs(directory)
        self.validateName(name)
        self.name = name
        self.directory = directory

    def load(self):
        f = open(self.directory + "/" + self.name).read()
        result = {
            'success': True,
            'data' : f,
            'errors': []
        }
        return result

    def save(self, data):
        with open(self.directory + "/" + self.name, 'w') as f:
            f.write(data)
        result = {
            'success': True,
            'errors': []
        }
        return result
