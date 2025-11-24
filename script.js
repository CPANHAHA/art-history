const overview = `\
西方美术的发展，大致从古典文明出发，经由宗教中世纪到人文复兴，继之以近现代与当代的多元实验。其脉络一方面受哲学与科学影响（如透视与解剖学），另一方面受社会与技术变迁推动（如工业化、摄影与大众传媒）。本页按学界常见分期，选取每期代表作品，以便快速把握该时期的核心观念与形式突破。`;

const periods = [
  {
    id: 'classical',
    title: '古希腊与罗马（古典时期）',
    years: '约前8世纪–4世纪/罗马至5世纪',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Venus_de_Milo_Louvre_Ma399_n4.jpg',
    meta: '理性比例·人体理想·写实雕塑',
    desc: '以理性与和谐为美的核心，确立人体理想与比例法则。',
    figure: '普拉克西特列斯、菲迪亚斯',
    work: '《米洛的维纳斯》（罗马复制古希腊原作）',
    breakthrough: '确立理想人体与比例，影响后世写实传统与审美范式。'
  },
  {
    id: 'byzantine',
    title: '早期基督教与拜占庭',
    years: '4–13世纪',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/7/72/San_Vitale%2C_Ravenna%2C_mosaico_interno.jpg',
    meta: '圣像·金色背景·精神性',
    desc: '强调宗教象征与灵性空间，采用马赛克与金色背景。',
    figure: '匿名圣像匠、拉文纳工坊',
    work: '拉文纳圣维塔教堂马赛克',
    breakthrough: '以图像服务信仰与礼仪，风格化超越自然主义。'
  },
  {
    id: 'romanesque',
    title: '罗曼式',
    years: '约10–12世纪',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Conques_StFoy_Tympan.jpg',
    meta: '厚墙拱券·叙事门楣浮雕',
    desc: '修道院文化下的建筑与叙事雕刻，结构厚重。',
    figure: '康克圣福瓦工坊',
    work: '康克圣福瓦教堂西立面末日审判门楣',
    breakthrough: '门楣浮雕系统化叙事，服务教义启蒙。'
  },
  {
    id: 'gothic',
    title: '哥特式',
    years: '约12–15世纪',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Chartres_Cathedral_Stained_Glass.jpg',
    meta: '尖拱·飞扶壁·彩窗光影',
    desc: '结构技术的进步带来高耸空间与神秘光色。',
    figure: '沙特尔、巴黎圣母院工坊',
    work: '沙特尔大教堂彩窗',
    breakthrough: '结构减重与高耸垂直，形成光的神学空间。'
  },
  {
    id: 'renaissance',
    title: '文艺复兴',
    years: '14–16世纪',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Mona_Lisa.jpg',
    meta: '透视·解剖·人文主义',
    desc: '回归古典与自然，确立线性透视与科学观察。',
    figure: '达·芬奇、米开朗基罗、拉斐尔',
    work: '《蒙娜丽莎》',
    breakthrough: '线性透视与写实的系统革新，人文主体的确立。'
  },
  {
    id: 'mannerism',
    title: '矫饰主义',
    years: '16世纪中后期',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Parmigianino_-_Madonna_with_the_Long_Neck_-_Google_Art_Project.jpg',
    meta: '夸张比例·优雅扭曲',
    desc: '在古典规范上进行变形与修辞，追求优雅奇异。',
    figure: '帕尔米贾尼诺、布龙齐诺',
    work: '《长颈圣母》',
    breakthrough: '以人为表达的形式自由挑战经典比例。'
  },
  {
    id: 'baroque',
    title: '巴洛克',
    years: '17世纪',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Caravaggio_%281570-1609%29_-_The_Calling_of_Saint_Matthew_%281599-1600%29.jpg',
    meta: '戏剧光影·动态构图',
    desc: '强烈明暗对比与运动感，服务宗教与宫廷。',
    figure: '卡拉瓦乔、鲁本斯、贝尼尼',
    work: '《圣马太的蒙召》',
    breakthrough: '明暗对比与瞬间叙事的戏剧化革新。'
  },
  {
    id: 'rococo',
    title: '洛可可',
    years: '18世纪上半叶',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Fragonard%2C_The_Swing.jpg',
    meta: '轻快装饰·宫廷趣味',
    desc: '柔和色调与亲密题材，强调享乐与装饰性。',
    figure: '瓦托、弗拉戈纳尔',
    work: '《秋千》',
    breakthrough: '以轻巧装饰与私密情景更新绘画趣味。'
  },
  {
    id: 'neoclassicism',
    title: '新古典主义',
    years: '18世纪末–19世纪初',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Jacques-Louis_David%2C_Le_Serment_des_Horaces.jpg',
    meta: '清晰形体·共和德性',
    desc: '以古典道德与简洁造型回应启蒙与政治变革。',
    figure: '雅克-路易·大卫、安格尔',
    work: '《荷拉斯兄弟之誓》',
    breakthrough: '以古典规范承载现代政治与道德叙事。'
  },
  {
    id: 'romanticism',
    title: '浪漫主义',
    years: '19世纪前中期',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Eug%C3%A8ne_Delacroix_-_La_Libert%C3%A9_guidant_le_peuple.jpg',
    meta: '情感·色彩·主观体验',
    desc: '强调个人感受与历史激情，色彩自由。',
    figure: '德拉克洛瓦、透纳',
    work: '《自由引导人民》',
    breakthrough: '以主观激情和色彩推动表达的解放。'
  },
  {
    id: 'realism',
    title: '现实主义',
    years: '19世纪中期',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Gustave_Courbet_-_The_Stone_Breakers.jpg',
    meta: '平凡题材·社会现实',
    desc: '关注当下与劳动者，反对历史与神话理想化。',
    figure: '库尔贝、米勒',
    work: '《打石工》',
    breakthrough: '以现实生活为题材，改变艺术的社会向度。'
  },
  {
    id: 'impressionism',
    title: '印象派',
    years: '19世纪后期',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Claude_Monet%2C_Impression%2C_soleil_levant.jpg',
    meta: '户外光色·松散笔触',
    desc: '以瞬时光色与直接笔触捕捉感觉印象。',
    figure: '莫奈、雷诺阿、德加',
    work: '《日出·印象》',
    breakthrough: '以光色与笔触革新现实再现方式。'
  },
  {
    id: 'postimpressionism',
    title: '后印象派',
    years: '19世纪末–20世纪初',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    meta: '结构与主观表达',
    desc: '在印象基础上追求结构、象征与主观精神。',
    figure: '塞尚、梵高、高更',
    work: '《星夜》',
    breakthrough: '以结构与情感推进现代主义的多方向。'
  },
  {
    id: 'symbolism',
    title: '象征主义/新艺术',
    years: '19世纪末–20世纪初',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg',
    meta: '装饰性·象征寓意',
    desc: '以金箔与装饰图案承载象征性的情感与神话。',
    figure: '克里姆特、穆夏',
    work: '《吻》',
    breakthrough: '装饰语言与象征转化为主体表达。'
  },
  {
    id: 'fauvism',
    title: '野兽派',
    years: '20世纪初',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Henri_Matisse%2C_1905%2C_Fauvism%2C_Woman_with_a_Hat%2C_San_Francisco_Museum_of_Modern_Art.jpg',
    meta: '强色对比·简化形体',
    desc: '以激烈色彩和自由造型表达情绪力量。',
    figure: '马蒂斯、德兰',
    work: '《戴帽子的女人》',
    breakthrough: '以色彩本体为表达核心。'
  },
  {
    id: 'expressionism',
    title: '表现主义',
    years: '20世纪初–中期',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Wassily_Kandinsky%2C_1913_%28or_1911%29%2C_Composition_VII.jpg',
    meta: '内在情感·形式变形',
    desc: '强调情感张力与主观形变，走向非具象。',
    figure: '康定斯基、基尔希纳',
    work: '《构图VII》',
    breakthrough: '以形式与色彩传达精神性。'
  },
  {
    id: 'cubism',
    title: '立体主义',
    years: '20世纪初',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Les_Demoiselles_d%27Avignon.jpg',
    meta: '多视角·形体分解',
    desc: '打破单点透视，以多视角重构对象。',
    figure: '毕加索、布拉克',
    work: '《亚维农的少女》',
    breakthrough: '对象分解与重组，开启现代绘画结构革新。'
  },
  {
    id: 'futurism',
    title: '未来主义',
    years: '20世纪初',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Unique_Forms_of_Continuity_in_Space.jpg',
    meta: '速度·动势·机械美学',
    desc: '赞颂速度与技术，将动感实体化。',
    figure: '波丘尼、巴拉',
    work: '《空间中的连续性》',
    breakthrough: '运动与速度的造型化表达。'
  },
  {
    id: 'dada',
    title: '达达',
    years: '1916–1920s',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Duchamp_Fountain.jpg',
    meta: '观念颠覆·现成品',
    desc: '以反艺术姿态质疑艺术制度与价值。',
    figure: '马塞尔·杜尚、胡戈·鲍尔',
    work: '《泉》',
    breakthrough: '将现成物作为艺术，确立观念优先的突破。'
  },
  {
    id: 'surrealism',
    title: '超现实主义',
    years: '1920s–1940s',
    hero: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
    meta: '潜意识·梦境图像',
    desc: '以自动技法与梦境符号探索潜意识。',
    figure: '达利、马格利特',
    work: '《记忆的永恒》',
    breakthrough: '潜意识图像进入艺术的核心方法论。'
  },
  {
    id: 'abex',
    title: '抽象表现主义',
    years: '1940s–1950s',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Number_1A%2C_1948_by_Jackson_Pollock.jpg',
    meta: '动作绘画·全幅空间',
    desc: '以姿态与过程呈现主体性，画面无中心。',
    figure: '波洛克、德·库宁',
    work: '《一号（1948）》',
    breakthrough: '过程与动作成为作品的核心。'
  },
  {
    id: 'pop',
    title: '波普艺术',
    years: '1950s–1960s',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Warhol-Campbell_Soup-1.jpg',
    meta: '大众文化·复制图像',
    desc: '引入商品与媒体图像，讨论消费与符号。',
    figure: '安迪·沃霍尔、利希滕斯坦',
    work: '《金宝汤罐头》',
    breakthrough: '艺术与大众媒介融合，扩展图像语境。'
  },
  {
    id: 'minimalism',
    title: '极简主义',
    years: '1960s–1970s',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Donald_Judd%2C_Untitled%2C_1991.jpg',
    meta: '几何模块·去个人化',
    desc: '以工业材料与几何形体追求客观呈现。',
    figure: '唐纳德·贾德、索尔·勒维特',
    work: '《无题》',
    breakthrough: '作品作为客体与结构，弱化作者痕迹。'
  },
  {
    id: 'conceptual',
    title: '观念艺术',
    years: '1960s–1970s',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/2/25/One_and_Three_Chairs.jpg',
    meta: '概念主导·语言转向',
    desc: '以文本与指令等形式凸显观念本身。',
    figure: '约瑟夫·科苏斯、劳伦斯·韦纳',
    work: '《一与三把椅子》',
    breakthrough: '将“何为艺术”转化为逻辑与语言问题。'
  },
  {
    id: 'contemporary',
    title: '当代艺术',
    years: '1980s–至今',
    hero: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Jeff_Koons_Balloon_Dog_%28Magenta%29.jpg',
    meta: '全球化·跨媒介·话语多元',
    desc: '结合新材料与技术，讨论身份、资本与生态等议题。',
    figure: '杰夫·昆斯、达米恩·赫斯特、草间弥生',
    work: '《气球狗》',
    breakthrough: '艺术边界扩展至装置、行为与新媒体。'
  }
];

function renderOverview(){
  const el = document.querySelector('.overview-content');
  el.textContent = overview;
}

function renderGrid(){
  const grid = document.getElementById('periodGrid');
  grid.innerHTML = periods.map(p => `
    <article class="card" data-id="${p.id}">
      <img class="thumb" src="/api/img/${p.id}" alt="${p.title} 代表作品预览" loading="lazy">
      <div class="card-body">
        <h3 class="card-title">${p.title}</h3>
        <p class="card-meta">${p.years} · ${p.meta}</p>
        <p class="card-desc">${p.desc}</p>
      </div>
    </article>
  `).join('');
}

function openModal(p){
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <h3 class="modal-title">${p.title}</h3>
    <p class="modal-sub">${p.years} · ${p.meta}</p>
    <div class="modal-grid">
      <img class="modal-img" src="/api/img/${p.id}" alt="${p.work}" loading="lazy">
      <div>
        <span class="badge">代表人物</span>
        <span class="badge">代表作品</span>
        <span class="badge">关键突破</span>
        <p class="kv"><b>代表人物：</b>${p.figure}</p>
        <p class="kv"><b>代表作品：</b>${p.work}</p>
        <p class="kv"><b>突破说明：</b>${p.breakthrough}</p>
        <p class="kv">${p.desc}</p>
      </div>
    </div>
  `;
  const modal = document.getElementById('artModal');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  const img = document.querySelector('.modal-img');
  if(img){
    img.addEventListener('error',()=>{
      const t = img.alt || '预览图';
      img.src = makePlaceholder(t);
    });
  }
}

function closeModal(){
  const modal = document.getElementById('artModal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

function bindEvents(){
  document.getElementById('periodGrid').addEventListener('click',e=>{
    const card = e.target.closest('.card');
    if(!card) return;
    const id = card.getAttribute('data-id');
    const p = periods.find(x=>x.id===id);
    if(p) openModal(p);
  });
  document.querySelectorAll('.thumb').forEach(img=>{
    img.addEventListener('error',()=>{
      const t = img.alt || '预览图';
      img.src = makePlaceholder(t);
    });
  });
  document.querySelectorAll('[data-dismiss="modal"]').forEach(el=>{
    el.addEventListener('click',closeModal);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closeModal();
  });
}

function makePlaceholder(text){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'>
    <rect width='100%' height='100%' fill='#1c1f28'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9aa3b2' font-size='28' font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'>${text}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

renderOverview();
renderGrid();
bindEvents();
