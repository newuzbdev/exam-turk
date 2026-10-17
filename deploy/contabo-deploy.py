#!/usr/bin/env python3
"""Command-restricted, per-application GitHub deployment receiver."""
from pathlib import Path, PurePosixPath
import fcntl, hashlib, io, json, os, re, shutil, socket, subprocess, sys, tarfile, time
import importlib.util

BASE = Path('/opt/eduway/deploy/github-autodeploy')
DEPLOY = BASE.parent
CONFIG = DEPLOY / 'application.compose.yml'
REPOS = {'frontend': 'newuzbdev/exam-turk', 'admin': 'newuzbdev/turk-test-admin', 'backend': 'Otanazarov/Turk-tili-api'}
SERVICES = {'frontend': ['frontend', 'domain_frontend'], 'admin': ['admin', 'domain_admin'], 'backend': ['backend']}
PROTECTED = ['Caddyfile', 'frontend.cloudflare-images.nginx.conf', 'admin.nginx.conf', 'load-env.cjs']
PRIVATE_FILES = ['/opt/eduway/secrets/backend.env', '/opt/eduway/secrets/infrastructure.env', '/opt/eduway/secrets/s3.json']
PUBLIC = {
    'VITE_API_URL': 'https://api.turkishmock.uz',
    'VITE_GOOGLE_CLIENT_ID': '816519766562-6q30ok84uh49jj2eh6d9vbjnmqu0uoti.apps.googleusercontent.com',
    'VITE_TELEGRAM_BOT_USERNAME': 'turkishmockbot',
    'VITE_ADMIN_APP_URL': 'https://admin.turkishmock.uz',
    'VITE_ADMIN_LAUNCH_FEATURES_ENABLED': 'true',
    'VITE_LEGAL_DRAFT_PREVIEW': 'false',
    'VITE_STUDENT_APP_URL': 'https://turkishmock.uz',
}

def parse_command(role, command):
    if role not in REPOS:
        raise ValueError('Unknown application')
    if command == 'probe':
        return 'probe', None
    match = re.fullmatch(r'(deploy|check) ([0-9a-f]{40})', command)
    if not match:
        raise ValueError('Only probe, check <SHA>, or deploy <SHA> is permitted')
    return match.groups()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def schema_files(root):
    paths = [root / 'prisma/schema.prisma'] + sorted((root / 'prisma/migrations').rglob('*'))
    return {str(path.relative_to(root)): sha(path) for path in paths if path.is_file()}

def assert_schema_unchanged(candidate, baseline):
    if schema_files(candidate) != schema_files(baseline):
        raise ValueError('Prisma schema/migration changes require a separate reviewed release')

def unpack(archive, destination, expected_sha):
    with tarfile.open(archive, 'r:gz') as bundle:
        if bundle.pax_headers.get('comment') != expected_sha:
            raise ValueError('Archive commit does not match the requested SHA')
        members = bundle.getmembers()
        if len(members) > 20000 or sum(item.size for item in members) > 2 * 1024**3:
            raise ValueError('Source archive exceeds the application limit')
        for item in members:
            path = PurePosixPath(item.name)
            if path.is_absolute() or '..' in path.parts or not (item.isdir() or item.isfile()):
                raise ValueError('Unsafe archive member')
            if set(path.parts) & {'.git', 'node_modules', 'dist', 'uploads', '.ssh', 'secrets', '.local'}:
                raise ValueError('Runtime data is not accepted in the source archive')
            if path.name.startswith('.env') and not path.name.endswith('.example'):
                raise ValueError('Runtime environment files are not accepted')
            if path.suffix in {'.pem', '.key', '.p12', '.pfx'}:
                raise ValueError('Private key files are not accepted')
        for item in members:
            target = destination.joinpath(*PurePosixPath(item.name).parts)
            if item.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(item) as source, target.open('wb') as output:
                    shutil.copyfileobj(source, output)
                target.chmod(0o755 if item.mode & 0o111 else 0o644)
    for required in ['Dockerfile', 'package.json', 'package-lock.json', '.dockerignore']:
        if not (destination / required).is_file():
            raise ValueError('Application source is incomplete: ' + required)

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def out(args):
    return run(args, capture_output=True, text=True).stdout.strip()

def compose(*args):
    return ['docker', 'compose', '-p', 'eduway', '--env-file', '/opt/eduway/secrets/infrastructure.env',
            '-f', str(DEPLOY / 'infrastructure.compose.yml'), '-f', str(DEPLOY / 'storage.compose.yml'),
            '-f', str(CONFIG), *args]

def snapshot():
    ids = out(['docker', 'ps', '-q', '--filter', 'label=com.docker.compose.project=eduway']).split()
    entries = json.loads(out(['docker', 'inspect', *ids]))
    return {entry['Config']['Labels']['com.docker.compose.service']: {
        'container': entry['Id'], 'image': entry['Config']['Image'], 'imageId': entry['Image'],
        'health': entry['State'].get('Health', {}).get('Status'), 'status': entry['State']['Status'],
    } for entry in entries}

def protected_hashes():
    paths = [DEPLOY / filename for filename in PROTECTED] + [Path(name) for name in PRIVATE_FILES]
    return {str(path): sha(path) for path in paths}

def replace_images(text, replacements):
    for service, image in replacements.items():
        pattern = r'(?m)^(  ' + re.escape(service) + r':\n    image: )[^\n]+$'
        text, count = re.subn(pattern, lambda match: match.group(1) + image, text)
        if count != 1:
            raise ValueError('Unexpected Compose layout: ' + service)
    return text

def write_atomic(path, payload, mode=0o600):
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(payload)
    temporary.chmod(mode)
    os.replace(temporary, path)

def verify_services(role, images):
    deadline = time.monotonic() + (160 if role == 'backend' else 45)
    while time.monotonic() < deadline:
        current = snapshot()
        okay = True
        for service, image in images.items():
            entry = current.get(service, {})
            okay = okay and entry.get('image') == image and entry.get('status') == 'running'
            if role == 'backend':
                okay = okay and entry.get('health') == 'healthy'
            else:
                response = subprocess.run(['docker', 'exec', 'eduway-' + service + '-1',
                                           'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1/'],
                                          capture_output=True, timeout=10)
                okay = okay and response.returncode == 0
        if okay:
            return current
        time.sleep(3)
    raise RuntimeError('Application health verification failed')

def main(role, command):
    assert socket.gethostname() == 'vmi3646355'
    action, revision = parse_command(role, command)
    if action == 'probe':
        print(json.dumps({'application': role, 'restrictedReceiver': True, 'canReadRuntimeSecrets': False}))
        return
    BASE.mkdir(mode=0o700, exist_ok=True)
    with (BASE / 'deployment.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        release = BASE / 'releases' / role / (revision + '-' + str(time.time_ns()))
        release.mkdir(mode=0o700, parents=True)
        archive = release / 'source.tar.gz'
        with archive.open('wb') as target:
            total = 0
            while True:
                part = sys.stdin.buffer.read(1024 * 1024)
                if not part:
                    break
                total += len(part)
                if total > 800 * 1024**2:
                    raise ValueError('Compressed source exceeds the application limit')
                target.write(part)
        source = release / 'source'
        source.mkdir()
        unpack(archive, source, revision)
        baselines = json.loads((BASE / 'baselines.json').read_text())
        if role == 'backend':
            assert_schema_unchanged(source, Path(baselines[role]['source']))
        before = snapshot()
        protected_before = protected_hashes()
        config_before = CONFIG.read_text()
        if before['backend']['health'] != 'healthy':
            raise RuntimeError('Existing backend must be healthy before a release')
        asset_retention, previous_assets, asset_proof = None, {}, {}
        helper = source / 'deploy/retain-frontend-assets.py'
        if role == 'frontend' and helper.is_file():
            spec = importlib.util.spec_from_file_location('frontend_assets', helper)
            asset_retention = importlib.util.module_from_spec(spec); spec.loader.exec_module(asset_retention)
            for service in SERVICES[role]:
                previous_assets[service] = asset_retention.capture_previous_assets(service, before[service]['container'], release)
        if shutil.disk_usage('/opt').free < 6 * 1024**3:
            raise RuntimeError('At least 6 GiB free disk is required before a build')
        images = {}
        for service in SERVICES[role]:
            tag = 'eduway/' + role + ':github-' + service.replace('_', '-') + '-' + revision[:12]
            arguments = ['docker', 'build', '--label', 'org.opencontainers.image.revision=' + revision,
                         '--label', 'org.opencontainers.image.source=https://github.com/' + REPOS[role],
                         '--tag', tag]
            if role != 'backend':
                settings = dict(PUBLIC)
                if service == 'frontend':
                    settings.update(VITE_API_URL='https://api.195-88-87-174.sslip.io', VITE_ADMIN_APP_URL='https://admin.195-88-87-174.sslip.io')
                if service == 'admin':
                    settings.update(VITE_API_URL='https://api.195-88-87-174.sslip.io', VITE_STUDENT_APP_URL='https://app.195-88-87-174.sslip.io')
                allowed = {'VITE_API_URL', 'VITE_STUDENT_APP_URL'} if role == 'admin' else set(PUBLIC) - {'VITE_STUDENT_APP_URL'}
                for key in sorted(allowed):
                    arguments.extend(['--build-arg', key + '=' + settings[key]])
            print('Building ' + service, flush=True)
            with (release / (service + '-build.log')).open('w') as log:
                run([*arguments, str(source)], stdout=log, stderr=subprocess.STDOUT)
            if asset_retention:
                asset_proof[service] = asset_retention.layer_image(service, tag, release, previous_assets[service])
            if role != 'backend':
                run(['docker', 'run', '--rm', '--network', 'none', tag, 'nginx', '-t'], capture_output=True)
            images[service] = tag
        if protected_hashes() != protected_before or CONFIG.read_text() != config_before:
            raise RuntimeError('Server configuration changed during the build')
        if action == 'check':
            write_atomic(release / 'proof.json', json.dumps({'status': 'BUILT_NOT_DEPLOYED', 'application': role,
                                                          'commit': revision, 'images': images, 'assetRetention': asset_proof}, indent=2) + '\n')
            print('BUILD_CHECK_PASSED_LIVE_UNCHANGED', flush=True)
            return
        write_atomic(release / 'application.before.yml', config_before)
        candidate = replace_images(config_before, images)
        write_atomic(CONFIG, candidate, mode=0o644)
        try:
            run(compose('up', '-d', '--no-deps', *SERVICES[role]), capture_output=True)
            after = verify_services(role, images)
            if protected_hashes() != protected_before:
                raise RuntimeError('Protected runtime configuration changed')
            if {name: entry['container'] for name, entry in before.items() if name not in SERVICES[role]} != {
                    name: entry['container'] for name, entry in after.items() if name not in SERVICES[role]}:
                raise RuntimeError('An unrelated service changed')
        except Exception:
            write_atomic(CONFIG, config_before, mode=0o644)
            run(compose('up', '-d', '--no-deps', *SERVICES[role]), capture_output=True)
            verify_services(role, {service: before[service]['image'] for service in SERVICES[role]})
            print('ROLLED_BACK_TO_PREVIOUS_IMAGES', flush=True)
            raise
        baselines[role] = {'source': str(source), 'commit': revision, 'repository': REPOS[role], 'images': images}
        write_atomic(BASE / 'baselines.json', json.dumps(baselines, indent=2) + '\n')
        proof = {'status': 'PUBLISHED', 'application': role, 'commit': revision,
                 'images': {service: {'tag': tag, 'id': after[service]['imageId']} for service, tag in images.items()},
                 'protectedConfigurationUnchanged': True, 'otherServicesUnchanged': True,
                 'noDatabaseMigration': True, 'source': str(source), 'assetRetention': asset_proof}
        write_atomic(release / 'proof.json', json.dumps(proof, indent=2) + '\n')
        print(json.dumps(proof), flush=True)

if __name__ == '__main__':
    try:
        main(sys.argv[1], os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    except Exception as error:
        print('DEPLOYMENT_REFUSED: ' + str(error), file=sys.stderr)
        sys.exit(1)
