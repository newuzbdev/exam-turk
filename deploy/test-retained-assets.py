from pathlib import Path
import importlib.util, json, tempfile, unittest
from unittest.mock import patch

MODULE = Path(__file__).with_name('retain-frontend-assets.py')

class RetentionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        spec = importlib.util.spec_from_file_location('retained', MODULE)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)

    def tearDown(self): self.temp.cleanup()

    def fixture(self, name, files, current=None, seen=None):
        root = self.root / name
        (root / 'assets').mkdir(parents=True)
        for file, content in files.items(): (root / 'assets' / file).write_text(content)
        if current is not None:
            (root / self.module.MANIFEST).write_text(json.dumps({'version':1,'current':current,'lastUsed':seen or {}}))
        return root

    def test_previous_modules_and_dependencies_survive_without_old_html(self):
        current=self.fixture('new',{'new-abcd1234.js':'new'})
        old=self.fixture('old',{'old-abcd1234.js':'old','font-abcd1234.woff2':'font','index.html':'not public module'})
        output=self.root/'layer'
        result=self.module.prepare_layer(current,[(old,None)],output,now=1000000)
        self.assertEqual(result['retained'],2)
        self.assertTrue((output/'assets/old-abcd1234.js').exists())
        self.assertTrue((output/'assets/font-abcd1234.woff2').exists())
        self.assertFalse((output/'assets/index.html').exists())

    def test_expiration_survives_repeated_releases_and_current_names_are_retained(self):
        now=1000000
        current=self.fixture('new',{'new-abcd1234.js':'new'})
        old=self.fixture('old',{'old-abcd1234.js':'old','expired-abcd1234.js':'expired'},['old-abcd1234.js'],{'old-abcd1234.js':1,'expired-abcd1234.js':now-8*86400})
        output=self.root/'layer'
        self.module.prepare_layer(current,[(old,None)],output,now=now)
        metadata=json.loads((output/self.module.MANIFEST).read_text())
        self.assertEqual(metadata['lastUsed']['old-abcd1234.js'],now)
        self.assertNotIn('expired-abcd1234.js',metadata['lastUsed'])
        another=self.fixture('newer',{'next-abcd1234.js':'next'})
        self.module.prepare_layer(another,[(output,None)],self.root/'next-layer',now=now+3*86400)
        later=json.loads((self.root/'next-layer'/self.module.MANIFEST).read_text())
        self.assertEqual(later['lastUsed']['old-abcd1234.js'],now)
        self.module.prepare_layer(another,[(self.root/'next-layer',None)],self.root/'expired-layer',now=now+8*86400)
        self.assertFalse((self.root/'expired-layer/assets/old-abcd1234.js').exists())

    def test_name_collision_or_symlink_fails_before_overwriting_assets(self):
        current=self.fixture('new',{'same-abcd1234.js':'new'})
        old=self.fixture('old',{'same-abcd1234.js':'different'})
        with self.assertRaises(ValueError):self.module.prepare_layer(current,[(old,None)],self.root/'collision',now=1000000)
        (old/'assets/same-abcd1234.js').unlink()
        (old/'assets/link-abcd1234.js').symlink_to(current/'assets/same-abcd1234.js')
        with self.assertRaises(ValueError):self.module.prepare_layer(current,[(old,None)],self.root/'symlink',now=1000000)

    def test_malformed_age_metadata_and_large_payloads_are_rejected(self):
        current=self.fixture('new',{'new-abcd1234.js':'new'})
        old=self.fixture('old',{'old-abcd1234.js':'old'},[],{'old-abcd1234.js':float('inf')})
        with self.assertRaises(ValueError):self.module.prepare_layer(current,[(old,None)],self.root/'bad-age',now=1000000)
        with self.assertRaises(ValueError):self.module.prepare_layer(current,[],self.root/'large',now=1000000,max_bytes=1)

    def test_seed_images_are_limited_to_the_same_frontend_origin_and_recent_window(self):
        images=[{'tag':'eduway/frontend:github-domain-frontend-abc','created':999999}, {'tag':'eduway/frontend:github-frontend-abc','created':999999}, {'tag':'other:latest','created':999999}, {'tag':'eduway/frontend:github-domain-frontend-old','created':1}]
        selected=self.module.select_seed_images(images,'domain_frontend',1000000)
        self.assertEqual([image['tag'] for image in selected],['eduway/frontend:github-domain-frontend-abc'])

    def test_failed_snapshot_removes_only_its_own_stopped_container(self):
        calls=[]
        def checked(args):
            calls.append(args)
            return 'fixture-stopped-container' if args[:2]==['docker','create'] else ''
        with patch.object(self.module,'checked',side_effect=checked), patch.object(self.module,'snapshot',side_effect=RuntimeError('copy failed')):
            with self.assertRaises(RuntimeError):self.module.snapshot_image('fixture-image',self.root/'copy')
        self.assertEqual(calls[0],['docker','create','--network','none','fixture-image'])
        self.assertEqual(calls[-1],['docker','rm','fixture-stopped-container'])

    def test_image_layer_contains_old_modules_and_metadata_before_building(self):
        old=self.fixture('previous',{'old-abcd1234.js':'old'})
        service='domain_frontend';tag='eduway/frontend:github-domain-frontend-'+'a'*12
        def snapshot(image,dest):
            (dest/'assets').mkdir(parents=True)
            (dest/'assets/new-abcd1234.js').write_text('new')
        def build(args,**kwargs):
            self.assertEqual(args[:5],['docker','build','--network','none','--pull=false'])
            layer=Path(args[-1]);self.assertEqual((layer/'assets/old-abcd1234.js').read_text(),'old')
            self.assertTrue((layer/self.module.MANIFEST).is_file())
        with patch.object(self.module,'snapshot_image',side_effect=snapshot),patch.object(self.module.subprocess,'run',side_effect=build):
            proof=self.module.layer_image(service,tag,self.root/'release',[(old,None)])
        self.assertEqual(proof['retained'],1)

if __name__=='__main__':unittest.main()
