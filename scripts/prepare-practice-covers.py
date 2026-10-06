"""Prepare lossless responsive card copies; never change originals, scope or DB.

Run with the bundled Pillow runtime and a verified deploy content snapshot.
The output is keyed by source checksum; only card components consume it.
"""
import concurrent.futures
import hashlib
import io
import json
import os
from pathlib import Path
import sys

from PIL import Image, ImageOps

frontend = Path(__file__).resolve().parents[1]
workspace = frontend.parent
snapshot = Path(sys.argv[1]).resolve()
report_path = Path(sys.argv[2]).resolve()
manifest = json.loads((snapshot / 'manifest.json').read_text())
content_bytes = (snapshot / 'content.json').read_bytes()
if hashlib.sha256(content_bytes).hexdigest() != manifest['contentSha256']:
    raise SystemExit('Snapshot checksum mismatch')
content = json.loads(content_bytes)
media_by_id = {m['id']: m for m in manifest['media']}
public_by_path = {m['publicPath']: m for m in manifest['media'] if m.get('publicPath')}
selected = []
for model in ['ReadingPracticePassage', 'WritingPracticeTest', 'SpeakingPracticeTest']:
    for row in content['tables'][model]:
        ref = row.get('coverImageUrl')
        if not ref:
            continue
        media = public_by_path[ref] if ref.startswith('/') else media_by_id[ref.split('://', 1)[1]]
        if media['scope'] not in {'PUBLIC', 'AUTHENTICATED'}:
            raise SystemExit('Learner-owned media is never a card cover')
        selected.append((row['id'], model, media))

unique = {(m['scope'], m['sha256']): m for _, _, m in selected}
by_size = {}
for (_, digest), media in unique.items():
    if not media.get('publicPath'):
        by_size.setdefault(media['bytes'], set()).add(digest)

# Export removes signed refs. Recover source keys from the exact existing
# files, without reading a DB, an env file, or any learner recording.
source_keys = {}
local_root = workspace / 'backend/.local/private-media'
if local_root.is_dir():
    for file in local_root.rglob('*'):
        if file.is_symlink() or not file.is_file() or file.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
            continue
        candidates = by_size.get(file.stat().st_size)
        if not candidates:
            continue
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        if digest in candidates:
            source_keys.setdefault(digest, []).append('private-media/' + file.relative_to(local_root).as_posix())

public_output = frontend / 'public/generated/practice-covers-v1'
protected_output = workspace / 'backend/private-assets/practice-covers-v1'
for output in [public_output, protected_output]:
    output.mkdir(parents=True, exist_ok=True)

def prepare(pair):
    (scope, digest), media = pair
    source = snapshot / media['bundlePath']
    if not source.resolve().is_relative_to(snapshot) or source.is_symlink():
        raise ValueError('Unsafe media path')
    raw = source.read_bytes()
    if len(raw) != media['bytes'] or hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError('Source image checksum mismatch')
    with Image.open(io.BytesIO(raw)) as original:
        image = ImageOps.exif_transpose(original).convert('RGBA')
    widths = sorted({min(480, image.width), min(960, image.width), image.width})
    variants = []
    for width in widths:
        target = image if width == image.width else image.resize(
            (width, max(1, round(image.height * width / image.width))), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        target.save(buf, format='WEBP', lossless=True, method=6, exact=True)
        data = buf.getvalue()
        with Image.open(io.BytesIO(data)) as decoded:
            # Full-resolution pixels are identical; resized variants also decode
            # byte-for-byte to the intended resize. There is no lossy encoding.
            if decoded.convert('RGBA').tobytes() != target.tobytes():
                raise ValueError('Lossless pixel verification failed')
        # Keep full-size originals for large displays; don't duplicate them on disk.
        if width == image.width and width > 960:
            full_bytes = len(data)
            continue
        output = public_output if scope == 'PUBLIC' else protected_output
        file = output / f'{digest}-{width}.webp'
        file.write_bytes(data)
        if scope != 'PUBLIC':
            os.chmod(file, 0o600)
        variants.append({'width': width, 'height': target.height,
                         **({'src': '/generated/practice-covers-v1/' + file.name} if scope == 'PUBLIC' else {'relativePath': 'practice-covers-v1/' + file.name}),
                         'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    identities = [media['publicPath']] if media.get('publicPath') else source_keys.get(digest, []) + [media['targetKey']]
    if not media.get('publicPath') and not source_keys.get(digest):
        raise ValueError('Current source key not recovered')
    return (scope, digest), {'scope': scope, 'identities': sorted(set(identities)), 'originalBytes': len(raw),
                    'fullLosslessBytes': full_bytes if image.width > 960 else variants[-1]['bytes'],
                    'originalWidth': image.width, 'originalHeight': image.height, 'variants': variants}

prepared = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for index, (digest, data) in enumerate(pool.map(prepare, unique.items()), 1):
        prepared[digest] = data
        if index % 20 == 0:
            print(json.dumps({'prepared': index, 'total': len(unique)}), flush=True)

registry = {}
protected_registry = {}
for identifier, _, media in selected:
    data = prepared[(media['scope'], media['sha256'])]
    registry[identifier] = {key: data[key] for key in ['scope', 'identities', 'originalWidth', 'originalHeight']}
    registry[identifier]['variants'] = [{key: value for key, value in v.items() if key in {'width', 'height', 'src'}} for v in data['variants']]
    if data['scope'] == 'AUTHENTICATED':
        for key in data['identities']:
            protected_registry[key] = {'scope': data['scope'], 'variants': {str(v['width']): v['relativePath'] for v in data['variants']}}

registry_path = frontend / 'src/data/practice-cover-variants.json'
registry_path.write_text(json.dumps(registry, separators=(',', ':')) + '\n')
(workspace / 'backend/src/data/practice-cover-variants.json').write_text(json.dumps(protected_registry, separators=(',', ':')) + '\n')
report = {'cards': len(selected), 'uniqueCovers': len(prepared), 'losslessPixelChecks': 'PASS',
          'originalsChanged': False, 'databaseWrites': 0,
          'originalBytes': sum(data['originalBytes'] for data in prepared.values()),
          'fullLosslessBytes': sum(data['fullLosslessBytes'] for data in prepared.values()),
          'card480Bytes': sum(data['variants'][0]['bytes'] for data in prepared.values()),
          'card960Bytes': sum(next(v['bytes'] for v in data['variants'] if v['width'] == min(960, data['originalWidth'])) for data in prepared.values()),
          'generatedBytes': sum(sum(v['bytes'] for v in data['variants']) for data in prepared.values()),
          'publicCards': sum(m['scope'] == 'PUBLIC' for _, _, m in selected),
          'authenticatedCards': sum(m['scope'] == 'AUTHENTICATED' for _, _, m in selected),
          'registry': str(registry_path.relative_to(workspace)),
          'covers': {scope + ':' + digest: data for (scope, digest), data in prepared.items()}}
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, indent=2) + '\n')
os.chmod(report_path, 0o600)
print(json.dumps({key: value for key, value in report.items() if key != 'covers'}), flush=True)
