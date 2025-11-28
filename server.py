import os
import json
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(__file__)
CACHE_DIR = os.path.join(ROOT, 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)
DATA_DIR = os.path.join(ROOT, 'data')
os.makedirs(DATA_DIR, exist_ok=True)
DATA_PATH = os.path.join(DATA_DIR, 'reports.json')

_lock = threading.Lock()

def _ensure_data_file():
  if not os.path.exists(DATA_PATH):
    initial = {"reports":[],"categories":[{"id":"qita","name":"其他"},{"id":"icm","name":"ICM"},{"id":"x402","name":"X402"}],"last_edits":[]}
    with open(DATA_PATH,'w',encoding='utf-8') as f:
      json.dump(initial,f,ensure_ascii=False)

def _load_data():
  _ensure_data_file()
  with open(DATA_PATH,'r',encoding='utf-8') as f:
    return json.load(f)

def _atomic_save(data):
  tmp = DATA_PATH + '.tmp'
  with open(tmp,'w',encoding='utf-8') as f:
    json.dump(data,f,ensure_ascii=False)
  os.replace(tmp, DATA_PATH)

IMG_MAP = {
  'classical': 'https://upload.wikimedia.org/wikipedia/commons/7/79/Venus_de_Milo_Louvre_Ma399_n4.jpg',
  'byzantine': 'https://upload.wikimedia.org/wikipedia/commons/7/72/San_Vitale%2C_Ravenna%2C_mosaico_interno.jpg',
  'romanesque': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Conques_StFoy_Tympan.jpg',
  'gothic': 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Chartres_Cathedral_Stained_Glass.jpg',
  'renaissance': 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Mona_Lisa.jpg',
  'mannerism': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Parmigianino_-_Madonna_with_the_Long_Neck_-_Google_Art_Project.jpg',
  'baroque': 'https://upload.wikimedia.org/wikipedia/commons/0/00/Caravaggio_%281570-1609%29_-_The_Calling_of_Saint_Matthew_%281599-1600%29.jpg',
  'rococo': 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Fragonard%2C_The_Swing.jpg',
  'neoclassicism': 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Jacques-Louis_David%2C_Le_Serment_des_Horaces.jpg',
  'romanticism': 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Eug%C3%A8ne_Delacroix_-_La_Libert%C3%A9_guidant_le_peuple.jpg',
  'realism': 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Gustave_Courbet_-_The_Stone_Breakers.jpg',
  'impressionism': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Claude_Monet%2C_Impression%2C_soleil_levant.jpg',
  'postimpressionism': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  'symbolism': 'https://upload.wikimedia.org/wikipedia/commons/0/0b/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg',
  'fauvism': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Henri_Matisse%2C_1905%2C_Fauvism%2C_Woman_with_a_Hat%2C_San_Francisco_Museum_of_Modern_Art.jpg',
  'expressionism': 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Wassily_Kandinsky%2C_1913_%28or_1911%29%2C_Composition_VII.jpg',
  'cubism': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Les_Demoiselles_d%27Avignon.jpg',
  'futurism': 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Unique_Forms_of_Continuity_in_Space.jpg',
  'dada': 'https://upload.wikimedia.org/wikipedia/commons/7/79/Duchamp_Fountain.jpg',
  'surrealism': 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
  'abex': 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Number_1A%2C_1948_by_Jackson_Pollock.jpg',
  'pop': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Warhol-Campbell_Soup-1.jpg',
  'minimalism': 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Donald_Judd%2C_Untitled%2C_1991.jpg',
  'conceptual': 'https://upload.wikimedia.org/wikipedia/commons/2/25/One_and_Three_Chairs.jpg',
  'contemporary': 'https://upload.wikimedia.org/wikipedia/commons/2/23/Jeff_Koons_Balloon_Dog_%28Magenta%29.jpg',
}

class Handler(SimpleHTTPRequestHandler):
  def _send_json(self, obj, code=200):
    body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
    self.send_response(code)
    self.send_header('Content-Type','application/json; charset=utf-8')
    self.send_header('Cache-Control','no-store')
    self.end_headers()
    self.wfile.write(body)

  def _parse_body_json(self):
    length = int(self.headers.get('Content-Length','0'))
    raw = self.rfile.read(length) if length>0 else b''
    if not raw:
      return None
    try:
      return json.loads(raw.decode('utf-8'))
    except Exception:
      return None

  def do_GET(self):
    if self.path.startswith('/img/') or self.path.startswith('/api/img/'):
      pid = self.path.split('/img/',1)[1] if '/img/' in self.path else self.path.split('/api/img/',1)[1]
      url = IMG_MAP.get(pid)
      if not url:
        self.send_response(404)
        self.send_header('Content-Type','text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'Not Found')
        return
      cache_path = os.path.join(CACHE_DIR, pid)
      data = None
      content_type = 'image/jpeg'
      if os.path.exists(cache_path):
        with open(cache_path,'rb') as f:
          data = f.read()
        ct_path = cache_path + '.ct'
        if os.path.exists(ct_path):
          with open(ct_path,'r') as f:
            content_type = f.read().strip() or content_type
      else:
        try:
          req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
          with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            content_type = resp.headers.get('Content-Type','image/jpeg')
          with open(cache_path,'wb') as f:
            f.write(data)
          with open(cache_path+'.ct','w') as f:
            f.write(content_type)
        except Exception as e:
          self.send_response(502)
          self.send_header('Content-Type','text/plain; charset=utf-8')
          self.end_headers()
          self.wfile.write(('Bad Gateway: '+str(e)).encode('utf-8'))
          return
      self.send_response(200)
      self.send_header('Content-Type', content_type)
      self.send_header('Cache-Control','public, max-age=86400')
      self.end_headers()
      self.wfile.write(data)
      return
    if self.path.startswith('/api/visit'):
      qs = parse_qs(urlparse(self.path).query)
      peek = 'peek' in qs
      cnt_path = os.path.join(CACHE_DIR,'visits.txt')
      count = 0
      if os.path.exists(cnt_path):
        try:
          with open(cnt_path,'r') as f:
            count = int(f.read().strip() or '0')
        except: count = 0
      if not peek:
        count += 1
        try:
          with open(cnt_path,'w') as f:
            f.write(str(count))
        except: pass
      body = ('{"count":'+str(count)+'}').encode('utf-8')
      self.send_response(200)
      self.send_header('Content-Type','application/json; charset=utf-8')
      self.send_header('Cache-Control','no-store')
      self.end_headers()
      self.wfile.write(body)
      return
    if self.path.startswith('/api/reports'):
      qs = parse_qs(urlparse(self.path).query)
      category = qs.get('category',[None])[0]
      search = qs.get('search',[None])[0]
      sort = qs.get('sort',['recent'])[0]
      page = int(qs.get('page',['1'])[0] or '1')
      page_size = int(qs.get('page_size',['20'])[0] or '20')
      with _lock:
        data = _load_data()
      items = [r for r in data['reports'] if not r.get('deleted_at')]
      if category and category != 'ALL':
        items = [r for r in items if r.get('category') == category]
      if search:
        s = search.lower()
        items = [r for r in items if s in (r.get('project_name','').lower())]
      if sort == 'rating':
        items.sort(key=lambda r: (-1 if r.get('ai_rating') is None else r.get('ai_rating'), r.get('updated_at','')), reverse=True)
        # null 评分后置
        items = sorted(items, key=lambda r: (r.get('ai_rating') is None, -(r.get('ai_rating') or 0)))
      else:
        items.sort(key=lambda r: r.get('updated_at',''), reverse=True)
      total = len(items)
      start = (page-1)*page_size
      end = start + page_size
      self._send_json({"total": total, "items": items[start:end]})
      return
    if self.path.startswith('/api/categories'):
      with _lock:
        data = _load_data()
      self._send_json({"items": data['categories']})
      return
    return super().do_GET()

  def do_POST(self):
    if self.path.startswith('/api/reports/') and self.path.endswith('/restore-last-edit'):
      parts = self.path.strip('/').split('/')
      rid = parts[2] if len(parts)>=3 else None
      if not rid:
        self._send_json({"error":"Bad Request"},400)
        return
      with _lock:
        data = _load_data()
        snap = next((e for e in data['last_edits'] if e.get('report_id')==rid), None)
        if not snap:
          self._send_json({"error":"No snapshot"},404)
          return
        # restore
        restored = snap['snapshot']
        for i,r in enumerate(data['reports']):
          if r.get('id') == rid:
            data['reports'][i] = restored
            data['reports'][i]['updated_at'] = restored.get('updated_at')
            _atomic_save(data)
            break
      self._send_json({"ok":True})
      return
    if self.path.startswith('/api/reports'):
      obj = self._parse_body_json() or {}
      name = obj.get('project_name','').strip() if isinstance(obj.get('project_name'), str) else ''
      if not name:
        self._send_json({"error":"project_name is required"},400)
        return
      import time
      rid = str(int(time.time()*1000))
      now = __import__('datetime').datetime.now().isoformat()
      record = {
        "id": rid,
        "project_name": name,
        "category": obj.get('category') or 'qita',
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
      }
      # optional fields
      keys = [
        'ai_rating','twitter_handle','ticker','launchpad','labels','basic_info','team_background',
        'dev_activity_rating','dev_activity_note','token_mechanism','progress_plan','business_potential',
        'competitors','focus_points','sources','generated_at'
      ]
      for k in keys:
        record[k] = obj.get(k)
      with _lock:
        data = _load_data()
        data['reports'].append(record)
        _atomic_save(data)
      self._send_json(record, 201)
      return
    if self.path.startswith('/api/categories'):
      obj = self._parse_body_json() or {}
      name = (obj.get('name') or '').strip()
      if not name:
        self._send_json({"error":"name is required"},400)
        return
      cid = name.lower().replace(' ','_')
      with _lock:
        data = _load_data()
        if any(c['id']==cid or c['name']==name for c in data['categories']):
          self._send_json({"error":"category exists"},409)
          return
        data['categories'].append({"id":cid,"name":name})
        _atomic_save(data)
      self._send_json({"id":cid,"name":name},201)
      return
    return super().do_POST()

  def do_PUT(self):
    if self.path.startswith('/api/reports/'):
      parts = self.path.strip('/').split('/')
      rid = parts[2] if len(parts)>=3 else None
      obj = self._parse_body_json() or {}
      if not rid:
        self._send_json({"error":"Bad Request"},400)
        return
      now = __import__('datetime').datetime.now().isoformat()
      with _lock:
        data = _load_data()
        idx = next((i for i,r in enumerate(data['reports']) if r.get('id')==rid), -1)
        if idx < 0:
          self._send_json({"error":"Not Found"},404)
          return
        current = data['reports'][idx]
        # save last edit snapshot (deep copy)
        snap = dict(current)
        le = {"report_id": rid, "snapshot": snap, "edited_at": now}
        # replace or append single snapshot per report
        found = False
        for i,e in enumerate(data['last_edits']):
          if e.get('report_id')==rid:
            data['last_edits'][i] = le
            found = True
            break
        if not found:
          data['last_edits'].append(le)
        # apply changes
        for k,v in obj.items():
          if k == 'id' or k == 'created_at':
            continue
          current[k] = v
        current['updated_at'] = now
        data['reports'][idx] = current
        _atomic_save(data)
      self._send_json({"ok":True})
      return
    return super().do_PUT()

  def do_DELETE(self):
    if self.path.startswith('/api/reports/'):
      rid = self.path.strip('/').split('/')[2]
      now = __import__('datetime').datetime.now().isoformat()
      with _lock:
        data = _load_data()
        for r in data['reports']:
          if r.get('id') == rid:
            r['deleted_at'] = now
            r['updated_at'] = now
            _atomic_save(data)
            self._send_json({"ok":True})
            return
      self._send_json({"error":"Not Found"},404)
      return
    if self.path.startswith('/api/categories/'):
      cid = self.path.strip('/').split('/')[2]
      if cid == 'qita':
        self._send_json({"error":"'其他'不可删除"},400)
        return
      with _lock:
        data = _load_data()
        # remove category
        data['categories'] = [c for c in data['categories'] if c.get('id') != cid]
        # reassign reports to '其他'
        for r in data['reports']:
          if r.get('category') == cid:
            r['category'] = 'qita'
        _atomic_save(data)
      self._send_json({"ok":True})
      return
    return super().do_DELETE()

def main():
  port = int(os.environ.get('PORT','8000'))
  server = HTTPServer(('', port), Handler)
  print(f'Serving at http://localhost:{port}/')
  server.serve_forever()

if __name__ == '__main__':
  main()
