import re
import difflib
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional


@dataclass
class ParsedEntry:
    hours: Optional[float] = None
    project_name: Optional[str] = None
    description: Optional[str] = None
    entry_date: str = field(default_factory=lambda: date.today().isoformat())
    confidence: float = 0.0


_DAY_MAP = {
    "lundi": 0, "mardi": 1, "mercredi": 2, "jeudi": 3,
    "vendredi": 4, "samedi": 5, "dimanche": 6,
}

_DATE_PATTERNS = [
    (r"\b(\d{4}-\d{2}-\d{2})\b", "iso"),
    (r"\b(\d{1,2})[/\-](\d{1,2})\b", "ddmm"),
    (r"\bhier\b", "hier"),
    (r"\bavant[- ]hier\b", "avant-hier"),
    (r"\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b", "weekday"),
    (r"\baujourd'?hui\b", "today"),
]


def _extract_date(text: str) -> tuple[str, str]:
    today = date.today()
    for pattern, kind in _DATE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if not m:
            continue
        text = text[:m.start()] + text[m.end():]
        if kind == "iso":
            return m.group(1), text.strip()
        if kind == "ddmm":
            d, mo = int(m.group(1)), int(m.group(2))
            return date(today.year, mo, d).isoformat(), text.strip()
        if kind == "hier":
            return (today - timedelta(days=1)).isoformat(), text.strip()
        if kind == "avant-hier":
            return (today - timedelta(days=2)).isoformat(), text.strip()
        if kind == "weekday":
            target = _DAY_MAP[m.group(1).lower()]
            diff = (today.weekday() - target) % 7 or 7
            return (today - timedelta(days=diff)).isoformat(), text.strip()
        if kind == "today":
            return today.isoformat(), text.strip()
    return today.isoformat(), text.strip()


def _normalize(text: str) -> str:
    text = text.strip().lower()
    text = text.replace("’", "'").replace(",", ".").replace("é", "e")
    return re.sub(r"\s+", " ", text)


_HOUR_PATTERNS = [
    # "3h sur Projet" or "3h projet"
    r"^(\d+(?:\.\d+)?)\s*h(?:eures?)?\s+(?:sur\s+|pour\s+|dans\s+)?(.+)$",
    # "j'ai travaillé 3h sur Projet"
    r"j.{0,5}ai\s+(?:travaille|passe|fait)\s+(\d+(?:\.\d+)?)\s*h(?:eures?)?\s+(?:sur|pour|dans|a)\s+(.+)$",
    # "Projet 3h"
    r"^(.+?)\s+(\d+(?:\.\d+)?)\s*h(?:eures?)?$",
    # "30min sur Projet"
    r"^(\d+)\s*min(?:utes?)?\s+(?:sur\s+|pour\s+)?(.+)$",
]


def _extract_hours(text: str) -> tuple[Optional[float], Optional[str], Optional[str]]:
    for i, pattern in enumerate(_HOUR_PATTERNS):
        m = re.match(pattern, text, re.IGNORECASE)
        if not m:
            continue
        if i == 2:  # "Projet 3h" — reversed order
            raw_project = m.group(1).strip()
            hours = float(m.group(2))
        elif i == 3:  # minutes
            hours = int(m.group(1)) / 60
            raw_project = m.group(2).strip()
        else:
            hours = float(m.group(1))
            raw_project = m.group(2).strip()

        # Split project/description on " - "
        if " - " in raw_project:
            parts = raw_project.split(" - ", 1)
            return hours, parts[0].strip(), parts[1].strip()
        return hours, raw_project, None
    return None, None, None


def parse(text: str, projects: list[dict]) -> ParsedEntry:
    text = _normalize(text)
    entry_date, text = _extract_date(text)
    hours, raw_project, description = _extract_hours(text)

    result = ParsedEntry(entry_date=entry_date)

    if hours is None or raw_project is None:
        return result

    result.hours = round(hours, 2)
    result.description = description

    # Fuzzy match project
    project_names = [p["name"] for p in projects]
    matches = difflib.get_close_matches(raw_project, project_names, n=3, cutoff=0.4)

    if not matches:
        result.project_name = raw_project
        result.confidence = 0.3
        return result

    best = matches[0]
    score = difflib.SequenceMatcher(None, raw_project.lower(), best.lower()).ratio()
    result.project_name = best
    result.confidence = min(score, 1.0)
    return result


def find_project_id(project_name: str, projects: list[dict]) -> Optional[int]:
    for p in projects:
        if p["name"].lower() == project_name.lower():
            return p["id"]
    return None
