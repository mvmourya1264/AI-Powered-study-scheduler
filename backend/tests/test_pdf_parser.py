import unittest

from app.pdf_parser import parse_syllabus_text


class ParseSyllabusTextTests(unittest.TestCase):
    def test_wrapped_title_merges_into_one_topic(self):
        raw = (
            "Introduction to Advanced Data Structures and Algorithms\n"
            "for Competitive Programming\n"
            "Sorting Algorithms\n"
        )
        topics = parse_syllabus_text(raw)
        titles = [t["title"] for t in topics]
        self.assertEqual(len(topics), 2)
        self.assertEqual(
            titles[0],
            "Introduction to Advanced Data Structures and Algorithms for Competitive Programming",
        )
        self.assertEqual(titles[1], "Sorting Algorithms")

    def test_plain_short_list_stays_separate_topics(self):
        raw = "Algebra\nGeometry\nCalculus\n"
        topics = parse_syllabus_text(raw)
        self.assertEqual([t["title"] for t in topics], ["Algebra", "Geometry", "Calculus"])

    def test_lowercase_continuation_merges_even_when_previous_is_short(self):
        raw = "Thermodynamics\nand heat transfer\n"
        topics = parse_syllabus_text(raw)
        self.assertEqual(len(topics), 1)
        self.assertEqual(topics[0]["title"], "Thermodynamics and heat transfer")

    def test_duplicate_titles_deduped_keeps_higher_marks(self):
        raw = "Mechanics (5 marks)\nMechanics\nCalculus\n"
        topics = parse_syllabus_text(raw)
        titles = [t["title"] for t in topics]
        self.assertEqual(len(topics), 2)
        self.assertEqual(titles, ["Mechanics", "Calculus"])
        self.assertEqual(topics[0]["marks"], 5.0)


if __name__ == "__main__":
    unittest.main()
