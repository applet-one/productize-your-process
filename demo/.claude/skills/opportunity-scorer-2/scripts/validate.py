"""Thin entry point; shared validator lives at the demo repository root."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / 'scripts'))
from validate_reports import main

if __name__ == '__main__':
    main('opportunity_scorecard')
