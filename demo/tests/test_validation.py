"""Regression tests using the included demo run; no files are modified."""
from copy import deepcopy
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import validate_reports as v


class ReportValidationTests(unittest.TestCase):
    def setUp(self):
        self.feedback_path = v.ROOT / 'output/2026-11-14/discovery/feedback-clusters-v2.md'
        self.score_path = v.ROOT / 'output/2026-11-14/strategy/opportunity-scorecard-v2.md'
        self.feedback = v.load(self.feedback_path)
        self.score = v.load(self.score_path)

    def reject_feedback(self, mutate):
        data = deepcopy(self.feedback)
        mutate(data)
        with self.assertRaises(ValueError):
            v.feedback(data, self.feedback_path)

    def reject_score(self, mutate):
        data = deepcopy(self.score)
        mutate(data)
        with self.assertRaises(ValueError):
            v.opportunities(data, self.score_path)

    def test_included_reports_pass(self):
        v.validate(self.feedback_path, 'feedback_clusters')
        v.validate(self.score_path, 'opportunity_scorecard')

    def test_duplicate_cluster_id(self):
        self.reject_feedback(lambda d: d['clusters'][1].update(id=d['clusters'][0]['id']))

    def test_uncovered_mention(self):
        self.reject_feedback(lambda d: d['clusters'][0]['mentions'].append({'id': 'invented', 'label': 'Not supported'}))

    def test_unknown_mention(self):
        self.reject_feedback(lambda d: d['clusters'][0]['evidence'][0].update(mention_id='unknown'))

    def test_quote_is_verbatim(self):
        self.reject_feedback(lambda d: d['clusters'][0]['evidence'][0].update(quote='Fabricated customer quote.'))

    def test_duplicate_evidence(self):
        self.reject_feedback(lambda d: d['clusters'][0]['evidence'].append(deepcopy(d['clusters'][0]['evidence'][0])))

    def test_minimum_cluster_count(self):
        self.reject_feedback(lambda d: d.update(clusters=d['clusters'][:2]))

    def test_minimum_independent_mentions(self):
        self.reject_feedback(lambda d: d['clusters'][0].update(mentions=d['clusters'][0]['mentions'][:1]))

    def test_missing_source(self):
        self.reject_feedback(lambda d: d['sources'].append('input/missing.md'))

    def test_all_input_files_required(self):
        self.reject_feedback(lambda d: d['sources'].pop())

    def test_path_traversal(self):
        for path in ('../README.md', '/etc/passwd', 'context/../README.md', 'context\\company.md'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                v.path(path)

    def test_wrong_run(self):
        self.reject_feedback(lambda d: d.update(run_id='2026-11-15'))

    def test_unknown_fields(self):
        self.reject_feedback(lambda d: d.update(extra='not in schema'))

    def test_unknown_cluster_reference(self):
        self.reject_score(lambda d: d['opportunities'][0].update(cluster_id='unknown'))

    def test_missing_scorecard(self):
        self.reject_score(lambda d: d['opportunities'].pop())

    def test_duplicate_scorecard(self):
        self.reject_score(lambda d: d['opportunities'].append(deepcopy(d['opportunities'][0])))

    def test_score_range_and_type(self):
        for value in (0, 6, True, 3.5, '4'):
            with self.subTest(value=value):
                self.reject_score(lambda d: d['opportunities'][0]['dimensions']['vision_fit'].update(score=value))

    def test_context_quote_is_verbatim(self):
        self.reject_score(lambda d: d['opportunities'][0]['dimensions']['vision_fit']['references'][0].update(quote='Invented strategy.'))

    def test_missing_context_reference(self):
        self.reject_score(lambda d: d['opportunities'][0]['dimensions']['vision_fit'].update(references=[]))

    def test_cross_run_cluster_file(self):
        self.reject_score(lambda d: d.update(clusters_file='output/2026-11-15/discovery/feedback-clusters-v2.md'))

    def test_bad_frontmatter(self):
        for content in (
            '# No frontmatter',
            '---\nkey: [unfinished\n---\n# Body',
            '---\nschema_version: 2\nschema_version: 2\n---\n# Body',
            '---\nschema_version: 2\nvalue: !custom text\n---\n# Body',
            '---\nschema_version: 2\na: &ref [1]\nb: *ref\n---\n# Body',
        ):
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / 'bad.md'
                path.write_text(content)
                with self.subTest(content=content), self.assertRaises((ValueError, v.yaml.YAMLError)):
                    v.load(path)

    def test_conventional_yaml_and_scalar_types(self):
        content = '''---
# Normal YAML, including comments, sequences and multiline strings.
schema_version: 2
run_id: 2026-11-14
title: yes
status: on
ready: true
score: 4
summary: >-
  First line
  continues here.
quote: |-
  One line
  Another line
sources:
  - input/raw_feedback/slack.md
---
# A readable report
'''
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'yaml.md'
            path.write_text(content)
            data = v.load(path)
        self.assertEqual(data['run_id'], '2026-11-14')
        self.assertEqual(data['title'], 'yes')
        self.assertEqual(data['status'], 'on')
        self.assertIs(data['ready'], True)
        self.assertIs(type(data['score']), int)
        self.assertEqual(data['summary'], 'First line continues here.')
        self.assertEqual(data['quote'], 'One line\nAnother line')
        self.assertEqual(data['sources'], ['input/raw_feedback/slack.md'])

    def test_yaml_nesting_limit(self):
        with self.assertRaises(ValueError):
            v.yaml.load('value: ' + '[' * 45 + '0' + ']' * 45, Loader=v.ReportLoader)


if __name__ == '__main__':
    unittest.main()
