"""Keep immutable public frontend assets available across image replacements."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, math, re, shutil, subprocess, time

MANIFEST = 'asset-release-manifest.json'
TTL = 7 * 86400
MAX_BYTES = 512 * 1024**2
EXTENSIONS = {'.js','.css','.woff','.woff2','.ttf','.otf','.png','.svg','.webp','.jpg','.jpeg','.gif','.avif','.ico','.mp3','.ogg','.wav','.m4a','.mp4','.webm'}

def assets(root):
    directory = root / 'assets'
    if not directory.is_dir() or directory.is_symlink(): raise ValueError('Missing regular public assets directory')
    result = {}
    for file in directory.rglob('*'):
        if file.is_symlink(): raise ValueError('Symlink in public assets')
        if not file.is_file(): continue
        if file.suffix.lower() not in EXTENSIONS or not re.search(r'-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$', file.name): continue
        name = file.relative_to(directory).as_posix()
        result[name] = (file,hashlib.sha256(file.read_bytes()).hexdigest())
    return result

def metadata(root, names, now):
    file = root / MANIFEST
    if file.is_symlink(): raise ValueError('Invalid asset metadata file')
    if not file.exists(): return None
    if file.stat().st_size > 2*1024**2: raise ValueError('Invalid asset metadata file')
    record = json.loads(file.read_text())
    if record.get('version') != 1 or not isinstance(record.get('current'),list) or not isinstance(record.get('lastUsed'),dict): raise ValueError('Invalid asset metadata')
    if set(record['lastUsed']) != set(names) or not set(record['current']) <= set(names): raise ValueError('Asset metadata differs from image files')
    for age in record['lastUsed'].values():
        if isinstance(age,bool) or not isinstance(age,(int,float)) or not math.isfinite(age) or age < 0 or age > now+300: raise ValueError('Invalid asset age')
    return record

def prepare_layer(current_root, previous, output, *, now=None, max_bytes=MAX_BYTES):
    now = time.time() if now is None else now
    current = assets(current_root)
    if not current: raise ValueError('Empty current build assets')
    chosen = {name:(file,sha,now) for name,(file,sha) in current.items()}
    for root, seeded_at in previous:
        old = assets(root)
        record = metadata(root,old,now)
        for name,(file,sha) in old.items():
            active_at = now if seeded_at is None else seeded_at
            last = active_at if record is None or name in record['current'] else record['lastUsed'][name]
            if last < now-TTL: continue
            if name in chosen:
                if chosen[name][1] != sha: raise ValueError('Immutable asset filename collision: '+name)
                if name not in current and last > chosen[name][2]: chosen[name]=(file,sha,last)
            else: chosen[name]=(file,sha,last)
    total = sum(file.stat().st_size for file,_,_ in chosen.values())
    if total > max_bytes or len(chosen)>10000: raise ValueError('Retained public assets exceed limit')
    if output.exists(): raise ValueError('Asset layer already exists')
    (output/'assets').mkdir(parents=True)
    for name,(file,_,_) in chosen.items():
        dest=output/'assets'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(file,dest)
    record={'version':1,'current':sorted(current),'lastUsed':{name:chosen[name][2] for name in sorted(chosen)}}
    (output/MANIFEST).write_text(json.dumps(record,sort_keys=True,separators=(',',':'))+'\n')
    return {'retained':len(chosen)-len(current),'current':len(current),'total':len(chosen),'bytes':total,'retentionDays':7}

def select_seed_images(images, service, now):
    if service not in ('frontend','domain_frontend'): raise ValueError('Unexpected frontend origin')
    prefix='eduway/frontend:github-'+service.replace('_','-')+'-'
    return sorted([item for item in images if item['tag'].startswith(prefix) and 0 <= now-item['created'] <= TTL],key=lambda item:item['created'],reverse=True)[:8]

def checked(args):
    return subprocess.check_output(args,text=True,stderr=subprocess.PIPE).strip()

def snapshot(container, destination):
    destination.mkdir(parents=True)
    checked(['docker','cp',container+':/usr/share/nginx/html/assets',str(destination/'assets')])
    subprocess.run(['docker','cp',container+':/usr/share/nginx/html/'+MANIFEST,str(destination/MANIFEST)],capture_output=True,check=False)

def snapshot_image(image, destination):
    container=checked(['docker','create','--network','none',image])
    try:snapshot(container,destination)
    finally:checked(['docker','rm',container])

def capture_previous_assets(service, container, release):
    """Capture before global release cleanup can remove old images."""
    root=release/'asset-retention'/service
    active=root/'previous'
    snapshot(container,active)
    previous=[(active,None)]
    if not (active/MANIFEST).exists():
        tags=checked(['docker','image','ls','eduway/frontend','--format','{{.Repository}}:{{.Tag}}']).splitlines()
        active_tag=checked(['docker','inspect','--format','{{.Config.Image}}',container])
        images=[]
        for tag in set(tags):
            if tag == active_tag: continue
            if not re.fullmatch(r'eduway/frontend:github-(?:domain-frontend|frontend)-[0-9a-f]{12}',tag): continue
            details=json.loads(checked(['docker','image','inspect',tag]))[0]
            created=datetime.fromisoformat(details['Created'][:19]).replace(tzinfo=timezone.utc).timestamp()
            images.append({'tag':tag,'created':created})
        for index,item in enumerate(select_seed_images(images,service,time.time())):
            dest=root/('seed-'+str(index));snapshot_image(item['tag'],dest);previous.append((dest,item['created']))
    return previous

def layer_image(service, tag, release, previous):
    if not re.fullmatch(r'eduway/frontend:github-'+service.replace('_','-')+r'-[0-9a-f]{12}',tag): raise ValueError('Unexpected frontend image tag')
    root=release/'asset-retention'/service
    current=root/'current';snapshot_image(tag,current)
    layer=root/'layer'
    proof=prepare_layer(current,previous,layer)
    (layer/'Dockerfile').write_text('FROM '+tag+'\nCOPY assets/ /usr/share/nginx/html/assets/\nCOPY '+MANIFEST+' /usr/share/nginx/html/'+MANIFEST+'\n')
    with (root/'layer-build.log').open('w') as log:
        subprocess.run(['docker','build','--network','none','--pull=false','--tag',tag,str(layer)],stdout=log,stderr=subprocess.STDOUT,check=True)
    (root/'proof.json').write_text(json.dumps(proof,indent=2)+'\n')
    return proof
