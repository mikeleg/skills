import argparse
import json
import math
import re
from datetime import datetime
from pathlib import Path

MAX_GAP_MINUTES = 15


def parse_ts(text):
    return datetime.fromisoformat(text.replace('Z', '+00:00'))


def typed_by_user(record):
    """Text the user typed (prompts), excluding tool results and meta messages."""
    if record.get('type') != 'user' or record.get('isMeta'):
        return ''
    content = record.get('message', {}).get('content')
    if isinstance(content, str):
        return content
    return ' '.join(c.get('text', '') for c in content or [] if c.get('type') == 'text')


def timestamps_in(path, ticket_pattern, dal):
    text = path.read_text(encoding='utf-8', errors='ignore')
    records = []
    for line in text.splitlines():
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(record, dict):
            records.append(record)
    if not any(ticket_pattern.search(typed_by_user(r)) for r in records):
        return []
    stamps = []
    for record in records:
        ts = record.get('timestamp')
        if not ts:
            continue
        moment = parse_ts(ts)
        if dal is None or moment > dal:
            stamps.append(moment)
    return sorted(stamps)


def active_minutes(stamps):
    total = 0.0
    for prev, cur in zip(stamps, stamps[1:]):
        gap = (cur - prev).total_seconds() / 60
        if gap <= MAX_GAP_MINUTES:
            total += gap
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('ticket_id')
    parser.add_argument('--dal')
    args = parser.parse_args()
    ticket_pattern = re.compile(rf'(?<!\d){re.escape(args.ticket_id)}(?!\d)')
    dal = parse_ts(args.dal) if args.dal else None
    sessions = Path.home().joinpath('.claude', 'projects').glob('*/*.jsonl')
    total = 0.0
    for path in sorted(sessions):
        stamps = timestamps_in(path, ticket_pattern, dal)
        if not stamps:
            continue
        minutes = active_minutes(stamps)
        total += minutes
        first = stamps[0].astimezone()
        last = stamps[-1].astimezone()
        print(f"{path.stem}  {first:%Y-%m-%d %H:%M}-{last:%H:%M}  {round(minutes)} min")
    hours = math.ceil(round(total) / 30) * 0.5
    print(f"TOTALE {round(total)} min -> {hours:g} h")


if __name__ == '__main__':
    main()
