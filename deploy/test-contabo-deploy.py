from pathlib import Path
import importlib.util, io, tarfile, tempfile, unittest
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).with_name('contabo-deploy.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
REVISION = 'a' * 40

class DeploymentGuards(unittest.TestCase):
    def test_frontend_receiver_enables_presence_for_both_public_origins(self):
        # Exercise the receiver's actual Docker arguments without starting Docker,
        # reading runtime secrets, or changing a live Compose configuration.
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            config = root / 'application.compose.yml'
            config.write_text('services:\n')
            (root / 'baselines.json').write_text('{}')
            commands = []
            current = {'backend': {'health': 'healthy'}}
            with patch.multiple(deploy, BASE=root, CONFIG=config, snapshot=lambda: current,
                                protected_hashes=lambda: {'protected': 'unchanged'},
                                unpack=lambda archive, destination, revision: None,
                                run=lambda args, **kwargs: commands.append(args)), \
                 patch.object(deploy.socket, 'gethostname', return_value='vmi3646355'), \
                 patch.object(deploy.shutil, 'disk_usage', return_value=SimpleNamespace(free=10 * 1024**3)), \
                 patch.object(deploy.sys, 'stdin', SimpleNamespace(buffer=io.BytesIO(b'fixture archive'))):
                deploy.main('frontend', 'check ' + REVISION)
            builds = [command for command in commands if command[:2] == ['docker', 'build']]
            self.assertEqual(len(builds), 2)
            for build in builds:
                arguments = [build[index + 1] for index, value in enumerate(build[:-1]) if value == '--build-arg']
                self.assertIn('VITE_ADMIN_LAUNCH_FEATURES_ENABLED=true', arguments)
                self.assertIn('VITE_LEGAL_DRAFT_PREVIEW=false', arguments)
            self.assertIn('VITE_API_URL=https://api.195-88-87-174.sslip.io', builds[0])
            self.assertIn('VITE_API_URL=https://api.turkishmock.uz', builds[1])
            self.assertEqual(config.read_text(), 'services:\n')

    def test_only_bound_application_commands_are_allowed(self):
        self.assertEqual(deploy.parse_command('frontend', 'deploy ' + REVISION), ('deploy', REVISION))
        for command in ['id', 'deploy main', 'deploy ' + REVISION + '; cat /run/secrets/backend.env', 'deploy ' + REVISION + ' extra']:
            with self.assertRaises(ValueError): deploy.parse_command('frontend', command)
        with self.assertRaises(ValueError): deploy.parse_command('proxy', 'deploy ' + REVISION)

    def test_image_change_keeps_unrelated_services_exactly(self):
        before = 'name: eduway\nservices:\n  frontend:\n    image: old\n    restart: unless-stopped\n  backend:\n    image: protected\n'
        after = deploy.replace_images(before, {'frontend': 'checked'})
        self.assertEqual(after, before.replace('image: old', 'image: checked'))
        with self.assertRaises(ValueError): deploy.replace_images(before, {'storage': 'bad'})

    def test_schema_or_migration_change_is_blocked(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in ['before', 'candidate']:
                (root / name / 'prisma/migrations/one').mkdir(parents=True)
                (root / name / 'prisma/schema.prisma').write_text('same')
                (root / name / 'prisma/migrations/one/migration.sql').write_text('same')
            deploy.assert_schema_unchanged(root / 'candidate', root / 'before')
            (root / 'candidate/prisma/migrations/one/migration.sql').write_text('changed')
            with self.assertRaises(ValueError): deploy.assert_schema_unchanged(root / 'candidate', root / 'before')

    def test_archive_cannot_write_paths_keys_or_runtime_data(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in ['../escape', '/etc/ssh/authorized_keys', '.env', 'deploy/key.pem', 'node_modules/injected.js', 'uploads/answer.wav']:
                archive = root / 'bad.tar.gz'
                with tarfile.open(archive, 'w:gz', format=tarfile.PAX_FORMAT, pax_headers={'comment': REVISION}) as bundle:
                    entry = tarfile.TarInfo(name); entry.size = 3
                    bundle.addfile(entry, io.BytesIO(b'bad'))
                with self.assertRaises(ValueError): deploy.unpack(archive, root / 'out', REVISION)
            with self.assertRaises(ValueError): deploy.unpack(archive, root / 'out', 'b' * 40)

    def test_symlink_archive_is_blocked(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); archive = root / 'bad.tar.gz'
            with tarfile.open(archive, 'w:gz', format=tarfile.PAX_FORMAT, pax_headers={'comment': REVISION}) as bundle:
                entry = tarfile.TarInfo('src/alias'); entry.type = tarfile.SYMTYPE; entry.linkname = '/etc'
                bundle.addfile(entry)
            with self.assertRaises(ValueError): deploy.unpack(archive, root / 'out', REVISION)

if __name__ == '__main__': unittest.main()
