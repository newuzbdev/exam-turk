from pathlib import Path
import argparse
import json
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
import xml.etree.ElementTree as ET

FRONTEND = Path(__file__).resolve().parents[1]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def check(config, output, image):
    results = []
    container = None
    with tempfile.TemporaryDirectory(prefix='turkishmock-seo-check-') as temporary:
        fixture = Path(temporary)
        site = fixture / 'site'
        site.mkdir()
        (site / 'assets').mkdir()
        (site / 'index.html').write_text('<!doctype html><html><body>student-app</body></html>')
        (site / 'assets/index-1234abcd.js').write_text('/* public build */')
        (site / 'favicon-red.png').write_bytes(b'public-logo')
        (site / 'private-audio.mp3').write_bytes(b'test-media')
        shutil.copyfile(FRONTEND / 'public/robots.txt', site / 'robots.txt')
        if (FRONTEND / 'public/sitemap.xml').exists():
            shutil.copyfile(FRONTEND / 'public/sitemap.xml', site / 'sitemap.xml')
        snippets = fixture / 'snippets'
        snippets.mkdir()
        if (FRONTEND / 'deploy/public-seo-locations.conf').exists():
            shutil.copyfile(FRONTEND / 'deploy/public-seo-locations.conf', snippets / 'public-seo-locations.conf')
        redirects = []
        image_redirects = FRONTEND / 'deploy/optimized-image-redirects.conf'
        if image_redirects.exists():
            shutil.copyfile(image_redirects, snippets / image_redirects.name)
            redirects = re.findall(r'location = (/\S+) \{ absolute_redirect off; return 301 (/\S+); \}', image_redirects.read_text())
            for _, target in redirects:
                destination = site / target.lstrip('/')
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(FRONTEND / 'public' / target.lstrip('/'), destination)
        try:
            container = run('docker', 'run', '--rm', '-d', '--name', 'turkishmock-seo-check-' + uuid.uuid4().hex[:10],
                            '--read-only', '--tmpfs', '/var/cache/nginx', '--tmpfs', '/var/run',
                            '-p', '127.0.0.1::80', '--entrypoint', 'nginx',
                            '-v', str(config.resolve()) + ':/etc/nginx/conf.d/default.conf:ro',
                            '-v', str(site) + ':/usr/share/nginx/html:ro',
                            '-v', str(snippets) + ':/etc/nginx/snippets:ro',
                            image, '-g', 'daemon off;')
            run('docker', 'exec', container, 'nginx', '-t')
            port = run('docker', 'port', container, '80/tcp').rsplit(':', 1)[1]
            origin = 'http://127.0.0.1:' + port
            opener = urllib.request.build_opener(NoRedirect)

            def get(path):
                req = urllib.request.Request(origin + path, headers={'Host': 'turkishmock.uz'})
                try:
                    response = opener.open(req, timeout=10)
                except urllib.error.HTTPError as error:
                    response = error
                return response.status, response.headers, response.read()

            for _ in range(20):
                try:
                    get('/')
                    break
                except urllib.error.URLError:
                    time.sleep(0.1)

            def expect(name, path, predicate):
                status, headers, body = get(path)
                try:
                    okay = bool(predicate(status, headers, body))
                except (ET.ParseError, ValueError):
                    okay = False
                results.append({'test': name, 'path': path, 'passed': okay, 'status': status,
                                'location': headers.get('Location'), 'canonical': headers.get('Link'),
                                'type': headers.get('Content-Type')})

            for old, new in [('/price', '/app/fiyatlar'), ('/test', '/app/test'), ('/signup', '/login')]:
                expect('old URL gives a permanent redirect preserving the query', old + '?ref=sample',
                       lambda s, h, b, new=new: s == 301 and h.get('Location') == new + '?ref=sample')
                expect('trailing slash uses the same destination', old + '/',
                       lambda s, h, b, new=new: s == 301 and h.get('Location') == new)
            expect('obsolete guide links to the public FAQ', '/how-it-works',
                   lambda s, h, b: s == 301 and h.get('Location') == '/#sss')
            expect('home is served without redirect and declares only the real canonical', '/',
                   lambda s, h, b: s == 200 and h.get('Link') == '<https://turkishmock.uz/>; rel="canonical"'
                   and b'student-app' in b)
            expect('sitemap is valid XML containing only the public home', '/sitemap.xml',
                   lambda s, h, b: s == 200 and 'xml' in h.get_content_type()
                   and [n.text for n in ET.fromstring(b).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
                   == ['https://turkishmock.uz/'])
            expect('robots advertises the sitemap and permits crawling', '/robots.txt',
                   lambda s, h, b: s == 200 and h.get_content_type() == 'text/plain'
                   and b'Sitemap: https://turkishmock.uz/sitemap.xml' in b and b'Allow: /' in b)
            for path in ['/app/profil', '/app/fiyatlar', '/login', '/privacy-policy?lang=uz', '/terms-of-service']:
                expect('active pages remain reachable and are not canonicalized to home', path,
                       lambda s, h, b: s == 200 and not h.get('Link') and b'student-app' in b)
            expect('public JS remains loadable', '/assets/index-1234abcd.js', lambda s, h, b: s == 200)
            expect('brand icon stays crawlable', '/favicon-red.png',
                   lambda s, h, b: s == 200 and h.get('X-Robots-Tag') == 'index, follow')
            expect('media search protection stays in place', '/private-audio.mp3',
                   lambda s, h, b: s == 200 and 'noindex' in h.get('X-Robots-Tag', ''))
            expect('missing JS cannot return the HTML app', '/assets/missing-1234abcd.js',
                   lambda s, h, b: s == 404)
            for old, target in redirects:
                expect('retired public image keeps its old address', old,
                       lambda s, h, b, target=target: s == 301 and h.get('Location') == target)
                expect('replacement is a real WebP with media search protection', target,
                       lambda s, h, b: s == 200 and h.get_content_type() == 'image/webp'
                       and b[:4] == b'RIFF' and b[8:12] == b'WEBP'
                       and 'noindex' in h.get('X-Robots-Tag', ''))
        finally:
            if container:
                subprocess.run(['docker', 'stop', container], check=False, stdout=subprocess.DEVNULL)
    output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'config': str(config), 'passed': sum(x['passed'] for x in results), 'total': len(results),
                      'failed': [x for x in results if not x['passed']]}, ensure_ascii=False, indent=2))
    return 0 if all(x['passed'] for x in results) else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('config', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--image', default='nginx:1.27-alpine')
    arguments = parser.parse_args()
    raise SystemExit(check(arguments.config, arguments.output, arguments.image))
