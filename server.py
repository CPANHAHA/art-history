import os
import urllib.request
from http.server import SimpleHTTPRequestHandler, HTTPServer

ROOT = os.path.dirname(__file__)
CACHE_DIR = os.path.join(ROOT, 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

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
    return super().do_GET()

def main():
  port = int(os.environ.get('PORT','8000'))
  server = HTTPServer(('', port), Handler)
  print(f'Serving at http://localhost:{port}/')
  server.serve_forever()

if __name__ == '__main__':
  main()
