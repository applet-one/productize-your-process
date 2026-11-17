"""Validate YAML-frontmatter reports, evidence, and cross-report references."""
import datetime
from pathlib import Path, PurePosixPath
import re
import sys

try:
    import yaml
except ImportError:
    raise SystemExit('PyYAML is required. From demo/: python3 -m pip install -r requirements.txt')

ROOT = Path(__file__).resolve().parents[1] / 'data'


def need(condition, message):
    if not condition:
        raise ValueError(message)


def string(value, label):
    need(isinstance(value, str) and bool(value.strip()), f'{label}: expected nonempty string')


def array(value, label, minimum=0):
    need(isinstance(value, list) and len(value) >= minimum, f'{label}: expected list with at least {minimum} entries')


def obj(value, keys, label):
    need(isinstance(value, dict), f'{label}: expected object')
    need(set(value) == set(keys.split()), f'{label}: expected exactly {keys}')


def unique(values, label):
    need(len(values) == len(set(values)), f'{label}: duplicate IDs or paths')


def path(value):
    string(value, 'path')
    p = PurePosixPath(value)
    need(not p.is_absolute() and '..' not in p.parts and '\\' not in value and str(p) == value, f'Unsafe path: {value}')
    resolved = (ROOT / value).resolve()
    need(resolved.is_relative_to(ROOT) and resolved.is_file(), f'Missing or unsafe file: {value}')
    need(p.suffix == '.md', f'Expected Markdown file: {value}')
    return resolved


def paths(values, label, minimum=1):
    array(values, label, minimum)
    for value in values:
        path(value)
    unique(values, label)


def exact(source, quote):
    string(quote, 'quote')
    need(quote in path(source).read_text(encoding='utf-8'), f'Quote not found in {source}: {quote[:70]}')


class ReportLoader(yaml.SafeLoader):
    """Safe YAML with JSON scalar types, unique keys, and bounded nesting."""
    yaml_implicit_resolvers = {}

    def compose_node(self, parent, index):
        need(not self.check_event(yaml.AliasEvent), 'YAML aliases are not supported')
        need(getattr(self.peek_event(), 'tag', None) is None, 'Explicit YAML tags are not supported')
        self.report_depth = getattr(self, 'report_depth', 0) + 1
        need(self.report_depth <= 40, 'YAML nesting exceeds 40 levels')
        try:
            return super().compose_node(parent, index)
        finally:
            self.report_depth -= 1

    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            need(isinstance(key, str), 'YAML mapping keys must be strings')
            need(key not in result, f'Duplicate YAML key: {key}')
            result[key] = self.construct_object(value_node, deep=deep)
        return result


# YAML 1.2 JSON scalar resolution: dates and words like yes/on remain strings.
for tag, pattern, initial in (
    ('null', r'^null$', ['n']),
    ('bool', r'^(?:true|false)$', ['t', 'f']),
    ('int', r'^-?(?:0|[1-9][0-9]*)$', list('-0123456789')),
    ('float', r'^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+(?:[eE][+-]?[0-9]+)?|[eE][+-]?[0-9]+)$', list('-0123456789')),
):
    ReportLoader.add_implicit_resolver(f'tag:yaml.org,2002:{tag}', re.compile(pattern), initial)


def load(filename):
    raw = filename.read_text(encoding='utf-8')
    match = re.match(r'^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$', raw)
    need(match is not None, 'Missing frontmatter delimiters')
    data = yaml.load(match[1], Loader=ReportLoader)
    need(isinstance(data, dict), 'Frontmatter must be an object')
    string(match[2], 'Markdown body')
    need(type(data.get('schema_version')) is int and data['schema_version'] == 2, 'Expected schema_version 2')
    run = data.get('run_id')
    string(run, 'run_id')
    need(re.fullmatch(r'\d{4}-\d{2}-\d{2}', run) is not None, 'run_id must be YYYY-MM-DD')
    datetime.date.fromisoformat(run)
    return data


def note(value, sources):
    obj(value, 'text sources', 'note')
    string(value['text'], 'note.text')
    paths(value['sources'], 'note.sources')
    need(set(value['sources']) <= set(sources), 'Note references undeclared source')


def feedback(data, filename):
    obj(data, 'schema_version kind run_id sources clusters outliers', 'feedback')
    need(filename == ROOT / f"output/{data['run_id']}/discovery/feedback-clusters-v2.md", 'Unexpected report location')
    paths(data['sources'], 'sources')
    expected = {str(p.relative_to(ROOT)) for p in (ROOT / 'input/raw_feedback').glob('*.md')}
    need(set(data['sources']) == expected, 'sources must list every input/raw_feedback/*.md file')
    array(data['clusters'], 'clusters', 3)
    need(len(data['clusters']) <= 6, 'At most 6 clusters')
    ids = []
    labels = {}
    for cluster in data['clusters']:
        obj(cluster, 'id title summary mentions evidence contradictions', 'cluster')
        for key in ('id', 'title', 'summary'):
            string(cluster[key], key)
        need(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', cluster['id']) is not None, 'Cluster ID must be a slug')
        ids.append(cluster['id'])
        array(cluster['mentions'], 'mentions', 2)
        mids = []
        for mention in cluster['mentions']:
            obj(mention, 'id label', 'mention')
            string(mention['id'], 'mention.id')
            string(mention['label'], 'mention.label')
            need(labels.get(mention['id'], mention['label']) == mention['label'], 'Inconsistent mention label')
            labels[mention['id']] = mention['label']
            mids.append(mention['id'])
        unique(mids, 'mentions')
        array(cluster['evidence'], 'evidence', 2)
        covered = set()
        quotes = []
        for ev in cluster['evidence']:
            obj(ev, 'mention_id source locator speaker quote', 'evidence')
            need(ev['mention_id'] in mids, 'Unknown mention_id')
            need(ev['source'] in data['sources'], 'Undeclared evidence source')
            for key in ('locator', 'speaker'):
                string(ev[key], key)
            exact(ev['source'], ev['quote'])
            covered.add(ev['mention_id'])
            quotes.append((ev['source'], ev['quote']))
        unique(quotes, 'evidence')
        need(covered == set(mids), 'Every mention requires evidence')
        array(cluster['contradictions'], 'contradictions')
        for value in cluster['contradictions']:
            note(value, data['sources'])
    unique(ids, 'clusters')
    array(data['outliers'], 'outliers')
    for value in data['outliers']:
        note(value, data['sources'])


def opportunities(data, filename):
    obj(data, 'schema_version kind run_id clusters_file context_files opportunities', 'scorecard')
    need(filename == ROOT / f"output/{data['run_id']}/strategy/opportunity-scorecard-v2.md", 'Unexpected report location')
    need(data['clusters_file'] == f"output/{data['run_id']}/discovery/feedback-clusters-v2.md", 'Cluster report must belong to same run')
    clusters_path = path(data['clusters_file'])
    clusters = validate(clusters_path, 'feedback_clusters')
    paths(data['context_files'], 'context_files')
    need(set(data['context_files']) == {'context/company.md', 'context/strategy.md'}, 'Expected company and strategy context')
    array(data['opportunities'], 'opportunities', 1)
    ids = []
    for opportunity in data['opportunities']:
        obj(opportunity, 'cluster_id dimensions conclusion', 'opportunity')
        string(opportunity['cluster_id'], 'cluster_id')
        ids.append(opportunity['cluster_id'])
        string(opportunity['conclusion'], 'conclusion')
        obj(opportunity['dimensions'], 'vision_fit repeatability buildability', 'dimensions')
        for dimension in opportunity['dimensions'].values():
            obj(dimension, 'score rationale references', 'dimension')
            need(type(dimension['score']) is int and 1 <= dimension['score'] <= 5, 'Score must be integer 1–5')
            string(dimension['rationale'], 'rationale')
            array(dimension['references'], 'references', 1)
            for ref in dimension['references']:
                obj(ref, 'source quote', 'reference')
                need(ref['source'] in data['context_files'], 'Reference must use declared context')
                exact(ref['source'], ref['quote'])
    unique(ids, 'opportunities')
    need(set(ids) == {c['id'] for c in clusters['clusters']}, 'Exactly one scorecard required per cluster')


def validate(filename, kind=None):
    filename = filename.resolve()
    need(filename.is_relative_to(ROOT), 'Report outside repository')
    data = load(filename)
    need(kind is None or data['kind'] == kind, f'Expected {kind}')
    need(data['kind'] in ('feedback_clusters', 'opportunity_scorecard'), 'Unknown report kind')
    (feedback if data['kind'] == 'feedback_clusters' else opportunities)(data, filename)
    return data


def main(kind=None):
    try:
        need(len(sys.argv) == 2, 'Usage: validate.py <report.md> (run from demo root)')
        filename = Path(sys.argv[1])
        data = validate(filename, kind)
        print(f"Valid {data['kind']}: {filename}")
    except (ValueError, KeyError, TypeError, OSError, yaml.YAMLError) as error:
        print(f'Validation failed: {error}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
