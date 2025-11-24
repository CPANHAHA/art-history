export const config = { runtime: 'nodejs' };

const IMG_MAP: Record<string, string> = {
  classical: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Venus_de_Milo_Louvre_Ma399_n4.jpg',
  byzantine: 'https://upload.wikimedia.org/wikipedia/commons/7/72/San_Vitale%2C_Ravenna%2C_mosaico_interno.jpg',
  romanesque: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Conques_StFoy_Tympan.jpg',
  gothic: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Chartres_Cathedral_Stained_Glass.jpg',
  renaissance: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Mona_Lisa.jpg',
  mannerism: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Parmigianino_-_Madonna_with_the_Long_Neck_-_Google_Art_Project.jpg',
  baroque: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Caravaggio_%281570-1609%29_-_The_Calling_of_Saint_Matthew_%281599-1600%29.jpg',
  rococo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Fragonard%2C_The_Swing.jpg',
  neoclassicism: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Jacques-Louis_David%2C_Le_Serment_des_Horaces.jpg',
  romanticism: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Eug%C3%A8ne_Delacroix_-_La_Libert%C3%A9_guidant_le_peuple.jpg',
  realism: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Gustave_Courbet_-_The_Stone_Breakers.jpg',
  impressionism: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Claude_Monet%2C_Impression%2C_soleil_levant.jpg',
  postimpressionism: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  symbolism: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg',
  fauvism: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Henri_Matisse%2C_1905%2C_Fauvism%2C_Woman_with_a_Hat%2C_San_Francisco_Museum_of_Modern_Art.jpg',
  expressionism: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Wassily_Kandinsky%2C_1913_%28or_1911%29%2C_Composition_VII.jpg',
  cubism: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Les_Demoiselles_d%27Avignon.jpg',
  futurism: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Unique_Forms_of_Continuity_in_Space.jpg',
  dada: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Duchamp_Fountain.jpg',
  surrealism: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
  abex: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Number_1A%2C_1948_by_Jackson_Pollock.jpg',
  pop: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Warhol-Campbell_Soup-1.jpg',
  minimalism: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Donald_Judd%2C_Untitled%2C_1991.jpg',
  conceptual: 'https://upload.wikimedia.org/wikipedia/commons/2/25/One_and_Three_Chairs.jpg',
  contemporary: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Jeff_Koons_Balloon_Dog_%28Magenta%29.jpg',
};

export default async function handler(req: any, res: any) {
  const { id } = req.query;
  const url = IMG_MAP[String(id)];
  if (!url) {
    res.status(404).send('Not Found');
    return;
  }
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) {
      res.status(resp.status).send('Upstream error');
      return;
    }
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await resp.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch (e: any) {
    res.status(502).send('Bad Gateway');
  }
}
