#!/usr/bin/env python3
"""Build the site's active collection; retain evidence/history separately in Git."""
import csv
import json
import re
from collections import Counter
from pathlib import Path
from map_contran import ROOT, normalized, write_json

CATEGORIES={
 'habilitacao':{'label':'Condutores e habilitação','description':'CNH, formação, exames e exercício do direito de dirigir.'},
 'registro':{'label':'Registro e licenciamento','description':'Propriedade, documentos, financiamento, licenciamento e baixa.'},
 'fiscalizacao':{'label':'Fiscalização e penalidades','description':'Autuação, multas, recursos e procedimentos de fiscalização.'},
 'circulacao':{'label':'Circulação e transporte','description':'Tráfego, transporte, pedágio, estacionamento e sinalização viária.'},
 'educacao':{'label':'Educação e gestão do SNT','description':'Campanhas, estrutura do SNT, competências e planejamento.'},
 'homologacao':{'label':'Homologação e conformidade','description':'Licenças, certificação, produção, ensaios e procedimentos institucionais.'},
 'gestao-normativa':{'label':'Gestão normativa','description':'Atos de revogação, nulidade e organização de referências legais.'},
 'regras-gerais':{'label':'Enquadramento e regras gerais','description':'Regras transversais sem associação comprovada a uma peça ou sistema.'},
 'emissoes-corporativas':{'label':'Emissões corporativas e créditos','description':'Metas corporativas, gestão de créditos, relatórios e obrigações do fabricante.'}
}
COMPONENTS={'vidros':'vidros','pneus-rodas':'pneus-rodas','freios':'freios','iluminacao':'iluminacao','ocupantes':'bancos',
 'carroceria':'carroceria','retrovisores':'retrovisores','propulsao':'motor','eletronica':'eletrica','identificacao':'identificacao','chassi':'chassi'}

def vehicle_links(record):
 text=normalized(record['subject']);links=[]
 # Administrative issuance of CSV is not exhaust emissions, despite the SISCSV name.
 if record['id'] in {'contran-922-2022','contran-916-2022'} or re.match(r'revogar?\b',text):return []
 for system in record['systems']:
  component=COMPONENTS.get(system)
  if not component:continue
  if record['id']=='contran-1021-2026' and system=='identificacao':continue
  sub=None
  if system=='ocupantes':
   sub='ocupantes/'+('airbag' if re.search('air.?bag',text) else 'criancas' if re.search('crianca|infantil',text) else 'materiais' if re.search('material|materiais|revestimento',text) else 'cintos' if re.search('cinto|ancoragem|banco|apoios',text) else '')
  elif system=='vidros':sub='vidros/'+('limpadores' if re.search('limpador|lavador',text) else 'janelas' if 'janelas' in text else 'vidros')
  elif system=='pneus-rodas':sub='pneus-rodas/'+('rodas' if 'rodas especiais' in text else 'pneus')
  elif system=='freios':sub='freios/'+('estabilidade' if 'estabilidade' in text else 'fluido' if 'fluido' in text else 'frenagem')
  elif system=='iluminacao':sub='iluminacao/dispositivos'
  elif system=='carroceria':sub='carroceria/'+('fechaduras' if re.search('fechadura|dobradica|portas',text) else 'impactos' if re.search('impacto|atropelamento|pedestre|capotagem',text) else 'acessorios')
  elif system=='retrovisores':sub='retrovisores/'+('monitoramento' if re.search('monitor|camera|alerta',text) else 'espelhos')
  elif system=='eletronica':sub='eletronica/'+('obd' if 'obd' in text else 'imagens' if 'image' in text else 'comandos')
  elif system=='identificacao':sub='identificacao/'+('placas' if 'placa' in text else 'rotulagem' if re.search('rotulo|etiqueta',text) else 'vin')
  elif system=='chassi':sub='chassi/componentes'
  elif system=='propulsao':
   if re.search('tanque|combustivel|gas natural|\bgnv\b',text):
    component='tanque' if 'tanque' in text else 'motor';sub='propulsao/combustiveis'
   elif re.search('bateria|propulsao.*eletric|propulsao hibrida|eixo eletrico|motor eletrico',text):
    sub='propulsao/eletrica'
    links.append({'componentId':'bateria','systemId':system,'subsystemId':sub,'basis':'Associação temática à propulsão elétrica; conferir os requisitos efetivos do ato.'})
   elif re.search('emiss|escapamento|gases|ruido',text):
    sub='propulsao/emissoes';links.append({'componentId':'escapamento','systemId':system,'subsystemId':sub,'basis':'Ementa referente a emissões/ruído; não representa aplicação automática ao veículo.'})
   else:sub='propulsao/componentes'
  if record['id']=='contran-910-2022' and system=='propulsao':component='tanque'
  if sub and sub.endswith('/'):sub=None
  links.append({'componentId':component,'systemId':system,'subsystemId':sub,'basis':'Vínculo temático pela ementa e taxonomia do projeto; confirmar categoria, requisitos e exceções no texto.'})
 return list({(x['componentId'],x['subsystemId']):x for x in links}.values())

def general_categories(record):
 text=normalized(record['subject'])
 if record['id'] in {'contran-922-2022','contran-916-2022'}:return ['homologacao']
 if record.get('actNature')=='revogatoria' or re.match(r'revogar?\b',text) or re.match('declara a nulidade',text):return ['gestao-normativa']
 if re.search('homologacao|certificacao|instituicao tecnica|codigo de marca|conformidade de producao',text):return ['homologacao']
 mapping={'condutores':'habilitacao','registro':'registro','fiscalizacao':'fiscalizacao','circulacao':'circulacao','organizacao':'educacao'}
 found=[mapping[x] for x in record.get('themes',[]) if x in mapping]
 return list(dict.fromkeys(found)) or ['regras-gerais']

def exclusion(record,policy,indexed):
 if record['id'] in policy['inactiveHistoricalIds']:return 'historico_inativado_pelo_responsavel'
 if record['id'] in policy.get('officialExclusions',{}):return 'revogacao_expressa_conferida_no_texto_oficial'
 if not record['currentIndication']:return 'fora_do_conjunto_com_vigencia_indicada'
 kinds={x['kind'] for x in record.get('temporalFlags',[])}
 if kinds & {'periodo_encerrado','prazo_principal_encerrado'}:return 'objeto_principal_com_prazo_encerrado'
 if 'aplicacao_temporal_condicionada' in kinds:return 'efeitos_temporarios_atuais_nao_confirmados'
 if 'suspensao_parcial' in kinds:return 'efeitos_remanescentes_a_conferir_antes_de_publicacao_ativa'
 targets=[indexed.get(f'contran-{x["number"]}-{x["year"]}') for x in record['relationships'] if x['kind']=='altera']
 targets=[x for x in targets if x]
 if targets and all(x['status']=='suspensa' or any(f['kind']=='suspensao_parcial' for f in x.get('temporalFlags',[])) for x in targets):
  return 'efeitos_de_alteracao_de_base_suspensa_a_conferir'
 if targets and all(x['status']=='revogada' for x in targets) and re.match(r'altera\b|referenda\b|da nova redacao',normalized(record['subject'])):
  return 'ato_modificador_de_bases_integralmente_revogadas'
 return None

def write_csv(path,records):
 fields=['id','number','year','subject','statusLabel','officialUrl','systems','vehicleLinks','generalCategories']
 with path.open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader()
  for r in records:w.writerow({k:json.dumps(r.get(k),ensure_ascii=False) if isinstance(r.get(k),list) else r.get(k,'') for k in fields})

def main():
 directory=ROOT/'data/contran';data=json.loads((directory/'inventory.json').read_text());policy=json.loads((directory/'publication-policy.json').read_text())
 indexed={r['id']:r for r in data['records']};active=[];decisions=[]
 markings=json.loads((ROOT/'data/markings/reviewed.json').read_text())['records']
 for original in data['records']:
  reason=exclusion(original,policy,indexed)
  decisions.append({'id':original['id'],'active':reason is None,'reason':reason,'reviewSource':policy['reviewSource'] if original['id'] in policy['inactiveHistoricalIds'] else policy.get('officialExclusions',{}).get(original['id'],'Critérios documentais de publicação conservadora.')})
  if reason:continue
  r=dict(original);r.update({'active':True,'vehicleLinks':vehicle_links(r)})
  r['regulatoryDomain']='environmental' if r['id']=='contran-958-2022' else 'safety'
  if r['id']=='contran-224-2006':
   r['catalogRecordIds']=sorted(set(r['catalogRecordIds']+['senatran-094']))
   r['notes']=r['notes']+['O índice e o cabeçalho do texto oficial usam 224/2006, publicado em 2007. O catálogo anterior e referências posteriores usam 224/2007. O vínculo com o limpador/lavador foi mantido com esta divergência de ano explícita.']
  enrichment=markings.get(r['id'],{})
  r['requirements']=enrichment.get('requirements',[]);r['topics']=enrichment.get('topics',[])
  r['vehicleLinks']+=enrichment.get('extraVehicleLinks',[])
  r['systems']=sorted(set(r['systems']+[x['systemId'] for x in r['vehicleLinks']]))
  r['generalCategories']=[] if r['vehicleLinks'] else general_categories(r)
  active.append(r)
 metadata={**data['metadata'],'publicationDate':policy['reviewDate'],'activeCount':len(active),'recordCount':len(active),
           'categoryLabels':{k:v['label'] for k,v in CATEGORIES.items()},'categories':CATEGORIES,
           'systemLinkedCount':sum(bool(r['vehicleLinks']) for r in active),
           'generalCategoryCount':sum(not r['vehicleLinks'] for r in active),
           'publicationPolicy':'A consulta pública contém somente o conjunto ativo. Atos revogados, suspensos, não confirmados e com efeitos atuais não confirmados ficam fora da consulta. A inativação dos 55 históricos foi determinada pelo responsável pelo acervo, sem fabricar ato oficial de revogação.',
           'withheldReasonCounts':dict(Counter(x['reason'] for x in decisions if x['reason']))}
 write_json(directory/'active.json',{'metadata':metadata,'records':active});write_csv(directory/'active.csv',active)
 write_json(directory/'publication-decisions.json',{'reviewDate':policy['reviewDate'],'decisions':decisions})
 (directory/'ACTIVE-LEIA-ME.txt').write_text(f'Acervo ativo CONTRAN — {policy["reviewDate"]}\n{len(active)} atos para consulta; {metadata["systemLinkedCount"]} ligados a sistemas e {metadata["generalCategoryCount"]} organizados em categorias gerais.\n'+metadata['publicationPolicy']+'\n'+ '\n'.join(data['metadata']['limits'])+'\n')
 print(json.dumps({k:metadata[k] for k in ['activeCount','systemLinkedCount','generalCategoryCount','withheldReasonCounts']},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
