from pathlib import Path
import json, math, re, zipfile
from html import escape
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'outputs'/'fluxo-arvore-seguranca'
WORK=ROOT/'work'/'previas-diagramas'
OUT.mkdir(parents=True,exist_ok=True)
WORK.mkdir(parents=True,exist_ok=True)
D=json.loads((ROOT/'outputs/levantamento-seguranca/inventario-seguranca.json').read_text(encoding='utf-8'))
BG='#F3F6FA'; WHITE='#FFFFFF'; INK='#172E47'; MUTED='#53667B'; LINE='#CCD6E1'
TEAL='#087F88'; TEAL_LIGHT='#E6F4F3'; BLUE='#346CA3'; BLUE_LIGHT='#EAF0F9'
AMBER='#9A5B0B'; AMBER_LIGHT='#FFF1DA'
FONTS={'regular':'segoeui.ttf','bold':'segoeuib.ttf','semibold':'seguisb.ttf'}

class Canvas:
    def __init__(self,w,h,name):
        self.w=w; self.h=h; self.name=name
        self.im=Image.new('RGB',(w,h),BG); self.draw=ImageDraw.Draw(self.im)
        self.svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',f'<rect width="{w}" height="{h}" fill="{BG}"/>']
    def font(self,size,weight='regular'):
        return ImageFont.truetype(str(Path('C:/Windows/Fonts')/FONTS[weight]),size)
    def wrap(self,text,size,width,weight='regular'):
        f=self.font(size,weight); result=[]
        for paragraph in text.split('\n'):
            current=''
            for word in paragraph.split():
                trial=(current+' '+word).strip()
                if self.draw.textlength(trial,font=f)>width and current:
                    result.append(current); current=word
                else: current=trial
            result.append(current)
        return result
    def text(self,x,y,text,size=28,color=INK,width=None,weight='regular',leading=1.3,limit=None):
        lines=self.wrap(str(text),size,width,weight) if width else str(text).split('\n')
        lineh=round(size*leading)
        if limit is not None:assert len(lines)*lineh<=limit,(self.name,text,len(lines)*lineh,limit)
        for i,line in enumerate(lines):
            font=self.font(size,weight)
            self.draw.text((x,y+i*lineh),line,font=font,fill=color,anchor='lt')
            self.svg.append(f'<text x="{x}" y="{y+i*lineh}" font-family="Segoe UI, Arial, sans-serif" font-size="{size}" font-weight="{700 if weight=="bold" else 600 if weight=="semibold" else 400}" fill="{color}" dominant-baseline="text-before-edge">{escape(line)}</text>')
            length=self.draw.textlength(line,font=font)
            assert x>=0 and y+i*lineh>=0 and x+length<=self.w+1 and y+(i+1)*lineh<=self.h+1,(self.name,line,x,y,length)
        return len(lines)*lineh
    def rect(self,x,y,w,h,fill=WHITE,r=24,stroke=None,sw=2):
        self.draw.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline=stroke,width=sw)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>')
    def line(self,points,color=LINE,width=4,arrow=False,dash=False):
        if dash:
            for p,q in zip(points,points[1:]):
                length=math.dist(p,q)
                for t in range(0,round(length),22):
                    ta=t/length if length else 0; tb=min(t+12,length)/length if length else 0
                    self.draw.line((p[0]+(q[0]-p[0])*ta,p[1]+(q[1]-p[1])*ta,p[0]+(q[0]-p[0])*tb,p[1]+(q[1]-p[1])*tb),fill=color,width=width)
        else:self.draw.line(points,fill=color,width=width,joint='curve')
        self.svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"'+(' stroke-dasharray="12 10"' if dash else '')+'/>')
        if arrow:
            a,b=points[-2:]; ang=math.atan2(b[1]-a[1],b[0]-a[0]); n=17
            tri=[b,(b[0]-n*math.cos(ang)+n*.5*math.sin(ang),b[1]-n*math.sin(ang)-n*.5*math.cos(ang)),(b[0]-n*math.cos(ang)-n*.5*math.sin(ang),b[1]-n*math.sin(ang)+n*.5*math.cos(ang))]
            self.draw.polygon(tri,fill=color)
            self.svg.append('<polygon points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in tri)+f'" fill="{color}"/>')
    def circle(self,x,y,r,fill):
        self.draw.ellipse((x-r,y-r,x+r,y+r),fill=fill)
        self.svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>')
    def header(self,number,title,subtitle):
        self.text(90,54,f'LEGISLAÇÃO AUTOMOTIVA / SEGURANÇA / {number}',23,TEAL,weight='semibold')
        self.text(90,108,title,62,weight='bold')
        self.text(90,194,subtitle,28,MUTED,width=self.w-180)
    def footer(self,text,y=None):
        y=y or self.h-88
        self.line([(90,y-22),(self.w-90,y-22)],LINE,2)
        self.text(90,y,text,23,MUTED,width=self.w-180)
    def save(self):
        self.im.save(OUT/f'{self.name}.png',optimize=True,dpi=(150,150))
        (OUT/f'{self.name}.svg').write_text('\n'.join(self.svg+['</svg>']),encoding='utf-8')
        preview=self.im.copy();preview.thumbnail((1600,1600));preview.save(WORK/f'{self.name}.png')

def flow():
    c=Canvas(2600,1880,'01-fluxo-homologacao')
    c.header('01','Da configuração do carro ao CAT','Fluxo proposto para leigos, organizado a partir das dez guias observadas no SISCAT.')
    xs=[100,950,1800];ys=[310,780,1250];w=700;h=330
    pos=[(xs[0],ys[0]),(xs[1],ys[0]),(xs[2],ys[0]),(xs[2],ys[1]),(xs[1],ys[1]),(xs[0],ys[1]),(xs[0],ys[2]),(xs[1],ys[2])]
    for a,b in zip(pos,pos[1:]):
        if a[1]==b[1]:
            direction=1 if b[0]>a[0] else -1
            c.line([(a[0]+w if direction==1 else a[0],a[1]+h/2),(b[0] if direction==1 else b[0]+w,b[1]+h/2)],TEAL,5,True)
        else:c.line([(a[0]+w/2,a[1]+h),(b[0]+w/2,b[1])],TEAL,5,True)
    c.line([(1300,780),(1300,706),(2150,706),(2150,780)],AMBER,4,True,True)
    c.text(1450,664,'Evidência insuficiente: rever o plano',23,AMBER)
    c.line([(100,1415),(48,1415),(48,945),(100,945)],AMBER,4,True,True)
    steps=[
      ('PERFIL','Caracterizar o veículo','Categoria, massas, propulsão, datas,\nconfigurações e equipamentos instalados.'),
      ('REGRAS','Avaliar a aplicabilidade','Ato, artigo, vigência, prazos e exceções.\nAplica / não aplica / falta dado / revisão.'),
      ('CONSULTA','Entender requisito e componente','Explicação leiga e fonte oficial.\nPeça no 3D e sistemas relacionados.'),
      ('PLANO','Planejar a comprovação','Documento ou ensaio, método, edição,\namostra e configuração coberta.'),
      ('EVIDÊNCIAS','Obter e revisar evidências','Laboratório, resultado e cobertura.\nSe insuficiente, rever o plano.'),
      ('DOSSIÊ','Montar documentos e declarações','Distribuir nas dez guias do SISCAT.\nConferir assinaturas e ENSV.'),
      ('ANÁLISE','Tratar exigências do processo','Submeter no fluxo autorizado.\nSe houver exigência, revisar o dossiê.'),
      ('DEFERIMENTO','CAT e requisitos posteriores','Registrar o deferimento.\nManter obrigações de uso e comercialização.'),
    ]
    for i,((x,y),(label,title,body)) in enumerate(zip(pos,steps)):
        c.rect(x,y,w,h);c.circle(x+54,y+52,26,TEAL)
        c.text(x+46,y+32,str(i+1),29,WHITE,weight='bold');c.text(x+104,y+37,label,23,TEAL,weight='semibold')
        used=c.text(x+34,y+105,title,37,INK,w-68,'bold',limit=100)
        c.text(x+34,y+123+used,body,28,MUTED,w-68,limit=h-145-used)
    c.rect(1800,1250,700,330,AMBER_LIGHT)
    c.text(1834,1283,'VALIDAÇÃO AINDA ABERTA',23,AMBER,weight='bold')
    c.text(1834,1332,'Direção, assentos e mangueiras;\natos complementares e atualidade.',31,INK,632,'semibold')
    c.text(1834,1450,'Métodos executáveis e vínculo às malhas\n3D serão validados em suas etapas.',27,MUTED,632)
    c.rect(100,1645,2400,90,TEAL_LIGHT,18)
    c.text(132,1667,'Consulta textual disponível em todo o percurso. O 3D ajuda a localizar; a conformidade depende da regra e da evidência.',28,INK,2336)
    c.footer('Base: captura SISCAT e inventário de segurança de 31/10/2026. Proposta funcional; submissão e análise não foram exercitadas.')
    c.save()

def overview():
    c=Canvas(3000,2380,'02-arvore-seguranca')
    c.header('02','Uma base de requisitos. Três formas de consultar.','Árvore de navegação proposta: veículo, dossiê e 3D compartilham as mesmas regras e evidências.')
    c.rect(1080,285,840,145,INK)
    c.text(1120,312,'SEGURANÇA DO AUTOMÓVEL',34,WHITE,weight='bold');c.text(1120,368,'Novo • fabricado no Brasil • categoria M1',28,'#D7E6F3')
    c.line([(1500,430),(1500,480)],TEAL,5,True);c.rect(720,480,1560,150,TEAL_LIGHT,20)
    c.text(760,503,'O perfil determina o que se aplica',33,INK,weight='bold')
    c.text(760,559,'Massa, propulsão, datas, configuração, equipamentos instalados e exceções de cada ato.',28,MUTED,1480)
    c.line([(1500,630),(1500,685)],TEAL,5);c.line([(500,685),(2500,685)],TEAL,5)
    for x in [500,1500,2500]:c.line([(x,685),(x,745)],TEAL,5,True)
    xs=[90,1090,2090];w=820;y=745;h=1210
    c.rect(xs[0],y,w,h);c.text(126,779,'01  VEÍCULO E SISTEMAS',30,TEAL,weight='bold');c.text(126,830,'O que o carro precisa cumprir',27,MUTED)
    groups=[
      ('Ocupantes e impactos','Bancos, cintos, ISOFIX, airbags, proteção frontal e lateral, pedestres.'),
      ('Freios, estabilidade e rodas','Freios, mangueiras, ESC, pneus, estepe e proteções de roda.'),
      ('Visibilidade e sinalização','Vidros, limpadores, retrovisores, iluminação e visão traseira.'),
      ('Carroceria e interior','Portas, vidros energizados, revestimentos, capô e para-sol.'),
      ('Propulsão e energia','Combustível, bateria de tração, alta tensão, GNV, tanques e escapamento.'),
      ('Identificação e capacidades','VIN, placa, massas, dimensões, lotação, MMV e modificações.'),
      ('Acessórios e uso','Quebra-mato, engate, bagageiro, transporte de crianças e manual.'),
    ]
    for i,(title,body) in enumerate(groups):
        ry=895+i*140;c.line([(127,ry+5),(127,ry+103)],TEAL,4)
        c.text(150,ry,title,29,INK,weight='semibold');c.text(150,ry+46,body,25,MUTED,710,limit=90)
    c.rect(xs[1],y,w,h);c.text(1126,779,'02  DOSSIÊ SISCAT',30,BLUE,weight='bold');c.text(1126,830,'Como comprovar e organizar a entrega',27,MUTED)
    display=['Representantes e responsáveis','Guia de recolhimento','Dados do requerente','Identificação veicular','Informações técnicas','Legislação complementar','Ensaios e avaliações','Etiqueta de Segurança (ENSV)','Certificado de Segurança','Diferenças entre processos']
    for i,title in enumerate(display):
        ry=900+i*73;c.text(1128,ry,f'{i+1:02}',25,BLUE,weight='bold');c.text(1190,ry,title,27,INK,675,limit=64)
        if i<9:c.line([(1128,ry+53),(1870,ry+53)],'#E6ECF2',2)
    c.rect(1125,1680,750,210,BLUE_LIGHT,18);c.text(1153,1705,'Dentro de Ensaios e Avaliações',27,INK,weight='semibold')
    c.text(1153,1760,'14 linhas N2 + 22 linhas N3.\n12 linhas N1 complementadas pelo Anexo XI.\nUma evidência pode cobrir vários requisitos.',25,MUTED,694)
    c.rect(xs[2],y,w,h);c.text(2126,779,'03  COMPONENTES NO 3D',30,TEAL,weight='bold');c.text(2126,830,'Onde a exigência aparece no veículo',27,MUTED)
    component_groups=[('Estrutura','Frente, laterais, traseira e habitáculo.'),('Proteção das pessoas','Bancos, cintos, apoios, ISOFIX e airbags.'),('Rodagem e frenagem','Freios, pneus, estepe e caixas de roda.'),('Visibilidade e comandos','Vidros, espelhos, luzes, painel e sensores.'),('Energia e propulsão','Motor, tanques e bateria de tração.'),('Acessórios e identificação','Quebra-mato, engate, bagageiro, VIN e placa.')]
    for i,(title,body) in enumerate(component_groups):
        ry=900+i*126;c.text(2128,ry,title,29,INK,weight='semibold');c.text(2128,ry+46,body,25,MUTED,735,limit=72)
    c.rect(2125,1680,750,210,TEAL_LIGHT,18);c.text(2153,1705,'41 identificadores semânticos',29,INK,weight='semibold')
    c.text(2153,1760,'Selecionar peça revela regras e documentos.\nSelecionar regra destaca as regiões afetadas.\nAssociação às malhas ainda por implementar.',25,MUTED,694)
    c.rect(90,2025,2820,175,INK,22);c.text(128,2051,'BASE COMPARTILHADA',22,'#9ED7D9',weight='bold')
    c.text(128,2101,'Ato e dispositivo  ↔  Requisito e condição  ↔  Evidência e configuração  ↔  Peça ou sistema',35,WHITE,2740,'semibold')
    c.text(128,2160,'Relações múltiplas: o mesmo documento pode atender a mais de uma regra; uma regra pode afetar várias peças.',25,'#D7E6F3',2740)
    c.footer('35 ramos complementares e 36 linhas de ensaio mapeados. Pendências normativas preservadas. Agrupamentos acima são de navegação, não novas obrigações.',2276)
    c.save()

def short_sources(ids):
    labels=[]
    for ident in ids:
        m=re.match(r'contran-(\d+)-(\d{4})',ident)
        if m:labels.append(f'{int(m[1])}/{m[2]}')
        elif ident=='portaria-senatran-1554-2022':labels.append('Port. 1.554/2022')
        elif ident.startswith('deliberacao-'):labels.append('Delib. '+ident.split('-')[1]+'/'+ident.split('-')[2])
    return 'Base mapeada: '+', '.join(labels)

def test_detail():
    c=Canvas(3400,3530,'03-arvore-ensaios')
    c.header('03','Ensaios e declarações: o ramo do dossiê','Inventário completo das linhas: rótulos resumidos para leitura. Aplicabilidade e entrega dependem do perfil e do fundamento.')
    w=1020;xs=[90,1190,2290];start=440
    for x,title,sub in zip(xs,['Nível 1','Nível 2','Nível 3'],['12 linhas do Anexo XI oficial','14 linhas observadas no SISCAT','22 linhas observadas no SISCAT']):
        c.rect(x,300,w,120,INK,18);c.text(x+28,321,title,34,WHITE,weight='bold');c.text(x+28,371,sub,24,'#D7E6F3')
    collections=[D['suplemento_nivel1_fonte_oficial'],D['matriz_ensaios'][:14],D['matriz_ensaios'][14:]]
    short_titles={'ENS-2-10':'Estepe temporário e sistemas alternativos','ENS-3-13':'Segurança de híbridos e elétricos','ENS-3-14':'AEBS: obstáculo móvel','ENS-3-15':'AEBS: obstáculo fixo','ENS-3-16':'Aviso de saída de faixa (LDWS)','ENS-3-18':'AEBS: pedestres','ENS-3-19':'AEBS: ciclistas','ENS-3-20':'Permanência em faixa (LKAS)','ENS-3-21':'Monitor de sonolência ou distração','ENS-3-22':'Cruzeiro adaptativo (ACC)','ENS-3-02':'Direção: absorção de energia','ENS-3-04':'Proteção ao ocupante: biomecânica'}
    for ci,rows in enumerate(collections):
        yy=start;x=xs[ci]
        for i,row in enumerate(rows):
            ident=row.get('id',f'N1-{i+1:02}');title=short_titles.get(ident,row.get('rotulo_siscat',row.get('rotulo_anexo_xi')))
            refs=row.get('fontes',row.get('fontes_para_revisao_atual',[]));flag=''
            if ident in ['ENS-3-01','ENS-3-02','ENS-3-05','ENS-2-07']:flag='Comprovação a confirmar'
            elif ident=='ENS-2-02':flag='Metadados do ano: conferir'
            elif ident=='ENS-2-13':flag='Fora do recorte M1 deste requisito'
            elif ident=='ENS-3-17':flag='Conferir tipo e escopo do veículo'
            elif ci==2 and i>=13:flag='Rotulagem: não presumir instalação obrigatória'
            elif ci==0 and i==11:flag='NICV: fora do primeiro recorte M1'
            base=short_sources(refs);tl=c.wrap(title,27,w-110,'semibold');bl=c.wrap(base,21,w-48)
            rh=25+len(tl)*35+len(bl)*27+(32 if flag else 0)+14
            c.rect(x,yy,w,rh,AMBER_LIGHT if flag.startswith(('Comprovação','Metadados')) else WHITE,14)
            c.text(x+23,yy+18,f'{i+1:02}',24,AMBER if flag.startswith(('Comprovação','Metadados')) else TEAL,weight='bold')
            used=c.text(x+80,yy+16,title,27,INK,w-110,'semibold');by=yy+24+used
            c.text(x+24,by,base,21,MUTED,w-48)
            if flag:c.text(x+24,by+len(bl)*27+5,flag,21,AMBER if flag.startswith(('Comprovação','Metadados')) else MUTED,w-48)
            yy+=rh+12
        if ci==0:
            c.rect(x,yy+25,w,280,BLUE_LIGHT,18);c.text(x+30,yy+55,'Como ler este ramo',30,INK,weight='bold')
            c.text(x+30,yy+112,'N1: fonte oficial complementar.\nN2/N3: linhas observadas na interface.\nO nome da linha não decide sozinho a obrigação.\nMétodo e cobertura precisam ser rastreáveis.',26,MUTED,w-60)
        assert yy<c.h-160,(ci,yy,c.h)
    c.footer('Base: inventário de 31/10/2026. Referências mapeadas não são consolidação automática. A legislação atual de ancoragem é 951/2022 com 997/2023.')
    c.save()

def complementary_detail():
    c=Canvas(3400,3020,'04-arvore-requisitos-complementares')
    c.header('04','Requisitos além das linhas de relatório','35 ramos complementares preservados. Alguns tratam de construção; outros, de acessórios, documentação, comercialização ou uso.')
    groups=[('Pessoas e interior',[5,11,15,23,30,31,32]),('Interface e informação',[6,7,8,12,16]),('Equipamentos e contingência',[1,13,14,17,18]),('Frente e acessórios',[2,3,4,9,10]),('Identificação e homologação',[19,20,21,33,34,35]),('Energia, massa e capacidade',[22,24,25,26]),('Iluminação',[27,28,29])]
    assert sorted(n for _,nums in groups for n in nums)==list(range(1,36))
    by_id={r['id']:r for r in D['requisitos_complementares']}
    positions=[(90,310),(1190,310),(2290,310),(90,1310),(1190,1310),(2290,1310),(90,2310)]
    for (title,nums),(x,y) in zip(groups,positions):
        w=1020;h=950 if y<2000 else 520;c.rect(x,y,w,h)
        c.text(x+28,y+24,title,34,INK,w-56,'bold');c.text(x+28,y+82,f'{len(nums)} ramos consultáveis',23,TEAL)
        c.line([(x+28,y+124),(x+w-28,y+124)],LINE,2);yy=y+150
        for n in nums:
            row=by_id[f'SEG-{n:03}'];used=c.text(x+28,yy,f'{n:02}  {row["titulo"]}',27,INK,w-56,'semibold')
            used2=c.text(x+28,yy+used+9,short_sources(row['fontes']),21,MUTED,w-56);yy+=used+used2+38
        assert yy<=y+h-12,(title,yy,y+h)
    c.rect(1190,2310,2120,520,TEAL_LIGHT)
    c.text(1226,2345,'Exemplo: quebra-mato',36,INK,weight='bold');c.text(1226,2410,'O veículo tem o acessório?',30,TEAL,weight='semibold')
    c.text(1226,2470,'Se não: não criar obrigação de instalação.\nSe sim: avaliar escopo, geometria, montagem, identificação, instruções e fornecedor.',28,INK,2020)
    c.text(1226,2590,'Conexões de projeto: proteção de pedestres, estrutura frontal, massas, dimensões e manual.\nComprovação: declaração/documento pertinente, sem inventar relatório autônomo.',27,MUTED,2020)
    c.text(1226,2720,'Uma ligação visual ajuda a consultar. A obrigação vem do dispositivo e de suas condições.',27,TEAL,2020,'semibold')
    c.footer('Agrupamentos de navegação, não categorias jurídicas. Equipamento listado não significa instalação obrigatória universal. Base: inventário de 31/10/2026.')
    c.save()

flow();overview();test_detail();complementary_detail()
(OUT/'LEIA-ME.md').write_text('''# Fluxo e árvore de segurança

Base: inventário de segurança e captura SISCAT de 31/10/2026.

- 01: fluxo proposto de consulta e homologação.
- 02: árvore geral e relações entre veículo, dossiê e componentes 3D.
- 03: todas as 36 linhas de ensaio e as 12 linhas de nível 1 complementadas por fonte oficial.
- 04: os 35 requisitos complementares, agrupados para navegação.

PNG para visualizar e compartilhar. SVG para ampliar como vetor.

As dez guias do exemplo foram observadas. A jornada leiga e a hierarquia são propostas funcionais, ainda não implementadas no aplicativo. Os 41 identificadores de componentes são semânticos; as malhas reais ainda não estão associadas. A revisão normativa integral permanece aberta nos pontos registrados no Excel.

Nomes resumidos nas imagens preservam os IDs do inventário. A ausência de linha no fluxo de relatórios não elimina uma obrigação técnica, e a presença de linha não cria obrigação universal. A aplicação depende de categoria, massa, configuração, datas e exceções do ato.

Fonte normativa de referência: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran
''',encoding='utf-8')
with zipfile.ZipFile(ROOT/'outputs'/'fluxo-arvore-seguranca.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.iterdir()):z.write(p,p.name)
print(json.dumps({'pngs':4,'svgs':4,'ensaios':36,'nivel1':12,'complementares':35,'componentes_semanticos':41},ensure_ascii=False))
