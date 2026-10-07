#!/usr/bin/env python3
"""Explicit, billable New API smoke test. Python 3.9+, standard library only.

No automatic POST retries. No HTTP redirects with a bearer token.
Resume a task with --task-id instead of submitting the same prompt again.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward authorization to another URL automatically.


MAX_JSON = 2 * 1024 * 1024
OPENER = build_opener(NoRedirect())


def save_json(path: Path, value: Any) -> None:
    with path.open('w', encoding='utf-8') as handle:
        os.chmod(path, 0o600)
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def json_request(base: str, key: str, path: str, *, payload=None, timeout=90):
    data = None if payload is None else json.dumps(payload).encode('utf-8')
    headers = {'Authorization': 'Bearer ' + key, 'Accept': 'application/json'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = Request(base + path, data=data, headers=headers, method='GET' if data is None else 'POST')
    with OPENER.open(request, timeout=timeout) as response:
        raw = response.read(MAX_JSON + 1)
        if len(raw) > MAX_JSON:
            raise RuntimeError('JSON response exceeded the 2 MiB limit')
        content_type = response.headers.get('Content-Type', '').lower()
        if 'json' not in content_type:
            raise RuntimeError('Expected JSON, got ' + content_type)
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise RuntimeError('Expected a JSON object')
        return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument('--submit', action='store_true', help='Create exactly one billable video task')
    choice.add_argument('--task-id', help='Resume polling/download; does not create a task')
    parser.add_argument('--model', default='veo-3.1-fast-generate-001', choices=['veo-3.1-fast-generate-001', 'veo-3.1-generate-001'])
    parser.add_argument('--prompt', default='A paper boat drifting on a quiet pond, gentle daylight, cinematic camera movement.')
    parser.add_argument('--seconds', type=int, choices=[4, 6, 8], default=4)
    parser.add_argument('--size', choices=['1280x720', '720x1280', '1920x1080', '1080x1920'], default='1280x720')
    parser.add_argument('--silent', action='store_true', help='Request generate_audio=false')
    parser.add_argument('--interval', type=float, default=10, help='Minimum 5 seconds; client polling interval')
    parser.add_argument('--deadline', type=int, default=1800, help='Stop polling after this many seconds; does not cancel the upstream task')
    parser.add_argument('--out', default='smoke-result', help='Local output folder; use a new one for each submission')
    args = parser.parse_args()
    base = os.environ.get('NEW_API_BASE', '').rstrip('/')
    key = os.environ.get('NEW_API_KEY', '')
    parsed = urlsplit(base)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
        parser.error('NEW_API_BASE must be the HTTPS origin, e.g. https://your-gateway.example (without /v1)')
    if not key or any(c.isspace() for c in key):
        parser.error('Set NEW_API_KEY to your New API user key, not the Leonardo key')
    if args.interval < 5 or args.deadline < args.interval:
        parser.error('Require interval >= 5 and deadline >= interval')
    if args.submit and args.size in ('1920x1080', '1080x1920') and args.seconds != 8:
        parser.error('This phase-1 plugin permits 1080p only with --seconds 8')

    output = Path(args.out).expanduser()
    output.mkdir(parents=True, exist_ok=True)
    os.chmod(output, 0o700)
    if args.submit and any(output.iterdir()):
        parser.error('For a new billable submission, choose a new/empty --out directory')
    task_id = args.task_id
    if args.submit:
        payload = {
            'model': args.model, 'prompt': args.prompt, 'seconds': str(args.seconds), 'size': args.size,
            'provider_options': {'leonardo': {'generate_audio': not args.silent}},
        }
        save_json(output / 'request.json', payload)
        print('Submitting ONE billable request. POST will not be retried.', flush=True)
        try:
            task = json_request(base, key, '/v1/videos', payload=payload)
        except Exception as exc:
            print('Submission outcome may be uncertain. Check New API/Leonardo task logs before submitting again.', file=sys.stderr)
            if isinstance(exc, HTTPError):
                detail = exc.read(MAX_JSON).decode('utf-8', errors='replace').replace(key, '[REDACTED]')
                save_json(output / 'submit-error.json', {'http_status': exc.code, 'response': detail})
            raise
        save_json(output / 'create-response.json', task)
        task_id = task.get('id')
        if not isinstance(task_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,191}', task_id):
            raise RuntimeError('No valid public task ID in create response. Do not automatically resubmit.')
        id_path = output / 'task-id.txt'
        id_path.write_text(task_id + '\n', encoding='utf-8')
        os.chmod(id_path, 0o600)
    if not task_id or not re.fullmatch(r'[A-Za-z0-9_-]{1,191}', task_id):
        parser.error('Invalid --task-id')
    print('Public task ID: ' + task_id, flush=True)

    deadline = time.monotonic() + args.deadline
    while time.monotonic() < deadline:
        try:
            task = json_request(base, key, '/v1/videos/' + task_id)
        except HTTPError as exc:
            if exc.code in (429, 500, 502, 503, 504):
                print('GET returned HTTP %d; waiting before another GET.' % exc.code, flush=True)
                time.sleep(args.interval)
                continue
            raise
        except (URLError, TimeoutError):
            print('GET transient connection error; waiting before another GET.', flush=True)
            time.sleep(args.interval)
            continue
        if task.get('id') != task_id:
            raise RuntimeError('Query response contains a different task ID')
        save_json(output / 'last-task.json', task)
        status = task.get('status')
        print('status=%s progress=%s' % (status, task.get('progress')), flush=True)
        if status == 'failed':
            raise RuntimeError('Generation failed. See last-task.json and the administrator logs; no resubmission performed.')
        if status == 'completed':
            break
        if status not in ('queued', 'in_progress'):
            raise RuntimeError('Unexpected public status: ' + str(status))
        time.sleep(args.interval)
    else:
        print('Polling deadline reached; the task was NOT cancelled. Resume with --task-id ' + task_id, file=sys.stderr)
        return 2

    headers = {'Authorization': 'Bearer ' + key}
    content_path = base + '/v1/videos/' + task_id + '/content'
    head = Request(content_path, headers=headers, method='HEAD')
    try:
        with OPENER.open(head, timeout=90) as response:
            save_json(output / 'content-head.json', {'status': response.status, 'headers': dict(response.headers)})
    except HTTPError as exc:
        print('HEAD did not succeed (HTTP %s); testing GET separately.' % exc.code, file=sys.stderr)

    destination = output / 'video.mp4'
    partial = output / 'video.mp4.part'
    if destination.exists():
        raise RuntimeError('video.mp4 already exists; choose a different --out directory')
    request = Request(content_path, headers=headers, method='GET')
    try:
        with OPENER.open(request, timeout=180) as response, partial.open('wb') as handle:
            os.chmod(partial, 0o600)
            first = response.read(65536)
            if len(first) < 12 or first[4:8] != b'ftyp':
                raise RuntimeError('Downloaded bytes do not have the expected MP4 ftyp header; refusing to save as a valid video')
            handle.write(first)
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
        partial.replace(destination)
    except Exception:
        if partial.exists():
            partial.unlink()
        raise
    print('Saved MP4: ' + str(destination))
    print('Also verify playback, task ownership and billing in the actual gateway.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print('Interrupted. No cancellation or repeat POST was sent.', file=sys.stderr)
        sys.exit(130)
    except Exception as error:
        # Avoid logging request headers or environment variables.
        print('ERROR: %s: %s' % (type(error).__name__, str(error)), file=sys.stderr)
        sys.exit(1)
