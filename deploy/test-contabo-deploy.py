from pathlib import Path
import importlib.util, io, tarfile, tempfile, unittest

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).with_name('contabo-deploy.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
REVISION = 'a' * 40

class DeploymentGuards(unittest.TestCase):
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
