import unittest
import os
from saved_programs import SavedPrograms

class TestSavedPrograms(unittest.TestCase):

    TEST_DIR = "/tmp/saved_programs_test"

    def setUp(self):
        if os.path.exists(TestSavedPrograms.TEST_DIR):
            os.rmdir(TestSavedPrograms.TEST_DIR)

    def tearDown(self):
        for root, dirs, files in os.walk(TestSavedPrograms.TEST_DIR, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))

    def test_dir_creation(self):
        SavedPrograms(name="test_file", directory=TestSavedPrograms.TEST_DIR)
        self.assertTrue(os.path.exists(TestSavedPrograms.TEST_DIR))

    def test_save_and_load(self):
        test_string = "1234"

        saved_programs = SavedPrograms(name="test_file", directory=TestSavedPrograms.TEST_DIR)
        result = saved_programs.save(test_string)
        self.assertTrue(result['success'])

        self.assertTrue(os.path.exists(TestSavedPrograms.TEST_DIR + "/test_file"))
        result = saved_programs.load()
        self.assertTrue(result['success'])
        self.assertEqual(result['data'], test_string)

if __name__ == '__main__':
    unittest.main()
