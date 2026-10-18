'use strict';
// These links reference the repository's catalogue, never ASA part numbers.
const vehicleComponents = [
  {id:'bancos', label:'Bancos e ocupantes', short:'Bancos', taxonomy:'ocupantes', asset:'assets/bancos.webp', crop:'530 190 430 325', path:'M560 315L616 211L677 208L700 249L730 216L804 221L902 268L939 391L863 464L728 511L548 407Z', lanes:[
    {id:'seguranca',label:'Segurança',topics:[
      {id:'ancoragem',label:'Ancoragem, cintos e apoios de cabeça',recordIds:['senatran-061','senatran-058','senatran-074'],text:'Referências de cintos, ancoragem, apoios de cabeça e aviso de não afivelamento já classificadas no acervo. Conferir objeto e anexos nas fontes.'},
      {id:'materiais',label:'Espuma, revestimento e inflamabilidade',recordIds:['senatran-092'],text:'O acervo associa materiais do habitáculo à referência de inflamabilidade. Isso não comprova requisitos específicos de composição, conforto ou durabilidade da espuma.',gaps:['Normas ABNT NBR específicas de espuma e bancos ainda não cadastradas nem verificadas.']},
      {id:'retencao',label:'Proteção e retenção dos ocupantes',taxonomy:['ocupantes/airbag','ocupantes/criancas'],text:'Referências temáticas de proteção e retenção; confirmar categorias e condições.'}
    ]}
  ]},
  {id:'motor',label:'Motor e transmissão',short:'Motor',taxonomy:'propulsao',asset:'assets/motor.webp',crop:'270 435 400 270',path:'M288 471L342 444L487 451L550 506L638 553L660 620L601 692L464 685L365 651L286 583Z',lanes:[
    {id:'seguranca',label:'Segurança e conformidade',topics:[
      {id:'componentes',label:'Componentes do motor',recordIds:['inmetro-045'],text:'Referência de conformidade de componentes do acervo. Verificar quais produtos e anexos efetivamente cobrem o componente em análise.',gaps:['Requisitos de segurança do conjunto completo do motor não foram mapeados neste protótipo.']}
    ]},
    {id:'ambiental',label:'Ambiental',topics:[
      {id:'gases',label:'Emissões de gases e partículas',recordIds:['ibama-042','senatran-069','ibama-021','ibama-026'],text:'Referências de emissões e procedimentos já cadastradas. Conferir categoria, combustível, fase e datas de aplicação.'},
      {id:'diagnostico',label:'Diagnóstico de emissões — OBD',taxonomy:['eletronica/obd'],text:'O acervo reúne procedimentos de diferentes categorias, incluindo motociclos e diesel. A seleção visual não filtra nem decide aplicabilidade.'},
      {id:'catalisador',label:'Catalisador e pós-tratamento',recordIds:['inmetro-052'],text:'Referência de conversores catalíticos de reposição, conforme classificação do acervo.'}
    ]}
  ]},
  {id:'tanque',label:'Tanque de combustível',short:'Tanque',taxonomy:'propulsao/combustiveis',asset:'assets/tanque.webp',crop:null,path:'M1100 785H1515V1015H1100Z',lanes:[
    {id:'seguranca',label:'Segurança',topics:[
      {id:'instalacao',label:'Tanques e alteração de capacidade',recordIds:['senatran-118'],text:'Referência cadastrada sobre múltiplos tanques, tanque suplementar e alteração de capacidade. Não equivale à validação de todos os requisitos de um tanque original.',gaps:['Demais requisitos de construção e instalação do tanque precisam de mapeamento específico.']}
    ]},
    {id:'ambiental',label:'Ambiental',topics:[
      {id:'evaporativas',label:'Emissões evaporativas e RVEP',recordIds:['ibama-031','ibama-020'],text:'Procedimentos e atualização já apontados no acervo. Ler os atos conjuntamente e verificar enquadramento.'},
      {id:'canister',label:'Cânister e circuito de vapores',recordIds:[],text:'Assunto físico para navegação. O acervo não contém uma associação específica validada para o cânister.',gaps:['Mapear requisitos específicos do cânister, válvulas e linhas de vapor.']}
    ]}
  ]},
  {id:'freios',label:'Freios e estabilidade',short:'Freios',taxonomy:'freios',crop:'740 720 170 210',path:'M769 773L812 756L857 780L869 844L840 884L794 889L764 844Z M1302 563L1334 558L1366 588L1360 630L1334 647L1302 628Z'},
  {id:'chassi',label:'Suspensão e direção',short:'Suspensão',taxonomy:'chassi',crop:'490 595 410 300',path:'M494 734L608 678L671 613L710 630L710 710L798 754L895 702L926 735L862 801L805 803L728 768L659 768L603 809L526 797Z M958 476L1064 416L1099 444L1079 492L1199 533L1246 502L1291 526L1298 564L1244 589L1140 549L1026 526L965 511Z'},
  {id:'vidros',label:'Vidros e visibilidade',short:'Vidros',taxonomy:'vidros',crop:'320 100 345 250',path:'M331 251L472 122L646 182L583 336L470 332Z'},
  {id:'iluminacao',label:'Iluminação e sinalização',short:'Iluminação',taxonomy:'iluminacao',crop:'320 748 210 100',path:'M342 774L439 752L522 767L509 802L476 827L410 823Z M33 495L58 478L88 515L93 563L62 589L34 572Z'},
  {id:'carroceria',label:'Carroceria e portas',short:'Carroceria',taxonomy:'carroceria',crop:'785 30 560 370',path:'M791 164L982 50L1187 37L1297 124L1340 245L1284 280L1236 268L1190 324L1108 350L1020 378L910 366L830 288Z M1247 351L1368 242L1409 291L1391 443L1262 513Z M1413 241L1509 188L1530 214L1514 355L1412 419Z M68 390L197 291L449 364L379 421L181 498L100 472Z M508 88L737 14L886 52L829 90L678 151Z'},
  {id:'retrovisores',label:'Retrovisores e visão traseira',short:'Retrovisores',taxonomy:'retrovisores',crop:'1120 323 120 97',path:'M1143 366L1180 336L1220 349L1233 376L1207 401L1137 400Z'},
  {id:'pneus-rodas',label:'Pneus e rodas',short:'Rodas',taxonomy:'pneus-rodas',crop:'860 747 225 235',path:'M875 870C859 801 925 741 995 763C1080 789 1079 917 1018 963C949 1011 865 955 875 870Z M1397 590C1413 538 1472 525 1502 560C1549 612 1500 706 1457 716C1390 724 1369 652 1397 590Z'},
  {id:'eletrica',label:'Elétrica e comandos',short:'Elétrica',taxonomy:'eletronica',crop:'560 452 200 157',path:'M578 475L647 472L672 507L705 521L717 566L750 575L748 610L694 608L671 577L620 568L569 544Z'},
  {id:'escapamento',label:'Escapamento e emissões',short:'Escapamento',taxonomy:'propulsao/emissoes',crop:'716 496 480 190',path:'M716 648L826 565L878 551L978 542L1045 514L1167 442L1201 450L1202 471L1098 519L1006 567L901 596L827 613L742 671Z'}
];
const ComponentFlow={
  component(id){return vehicleComponents.find(c=>c.id===id);},
  topics(component,hierarchy){return component.lanes||[{id:component.id==='escapamento'?'ambiental':'seguranca',label:component.id==='escapamento'?'Ambiental':'Segurança e conformidade',topics:(hierarchy.find(g=>g.id===component.taxonomy)?.children||[{id:component.taxonomy,label:component.label}]).map(c=>({id:c.id.split('/').pop(),label:c.label,taxonomy:[c.id]}))}];},
  records(topic,records){return topic.recordIds?records.filter(r=>topic.recordIds.includes(r.id)):records.filter(r=>(topic.taxonomy||[]).some(id=>(r.taxonomy||[]).some(t=>t===id||t.startsWith(id+'/'))));},
  unique(records){return [...new Map(records.map(r=>[r.id,r])).values()];}
};
if(typeof module!=='undefined')module.exports={vehicleComponents,ComponentFlow};

// Graphic layout is deterministic and stored independently of regulatory records.
// SVG viewports expose each cluster without modifying the generated originals.
const subsystemBoards={
 'vidros':{asset:'assets/vidros.webp',columns:3,rows:1},
 'pneus-rodas':{asset:'assets/pneus-rodas.webp',columns:2,rows:1},
 'freios':{asset:'assets/freios.webp',columns:3,rows:1},
 'iluminacao':{asset:'assets/iluminacao.webp',columns:2,rows:1},
 'ocupantes':{asset:'assets/ocupantes.webp',columns:2,rows:2},
 'carroceria':{asset:'assets/carroceria.webp',columns:3,rows:1},
 'retrovisores':{asset:'assets/retrovisores.webp',columns:2,rows:1},
 'eletronica':{asset:'assets/eletrica.webp',columns:3,rows:1},
 'identificacao':{asset:'assets/identificacao.webp',columns:3,rows:1},
 'chassi':{asset:'assets/chassi.webp',columns:1,rows:1}
};
const specialSubsystemArt={
 'propulsao/emissoes':{asset:'assets/escapamento.webp',columns:1,rows:1,index:0},
 'propulsao/eletrica':{asset:'assets/bateria.webp',columns:1,rows:1,index:0},
 'propulsao/combustiveis':{asset:'assets/tanque.webp',columns:1,rows:1,index:0},
 'propulsao/componentes':{asset:'assets/motor.webp',columns:1,rows:1,index:0}
};
const componentIllustrations={freios:'freios',chassi:'chassi',vidros:'vidros',iluminacao:'iluminacao',carroceria:'carroceria',retrovisores:'retrovisores','pneus-rodas':'pneus-rodas',eletrica:'eletrica',escapamento:'escapamento',bateria:'bateria',identificacao:'identificacao'};
vehicleComponents.push(
 {id:'bateria',label:'Bateria e propulsão elétrica',short:'Bateria',taxonomy:'propulsao/eletrica',asset:'assets/bateria.webp',path:'M106 530H280V575H106Z',external:true},
 {id:'identificacao',label:'Identificação e marcações',short:'Identificação',taxonomy:'identificacao',asset:'assets/identificacao.webp',path:'M165 697L236 715L233 740L163 719Z'}
);
for(const c of vehicleComponents){if(componentIllustrations[c.id])c.asset=`assets/${componentIllustrations[c.id]}.webp`;}
ComponentFlow.subsystems=function(c,hierarchy){
 const group=hierarchy.find(g=>g.physical&&(g.id===c.taxonomy||g.children.some(s=>s.id===c.taxonomy)));
 return group?group.children.filter(s=>c.taxonomy===group.id||s.id===c.taxonomy).map(s=>({id:s.id,label:s.label,system:group.id})):[];
};
ComponentFlow.art=function(subsystem,hierarchy){
 const group=hierarchy.find(g=>g.id===subsystem.system);const board=specialSubsystemArt[subsystem.id]||subsystemBoards[subsystem.system];
 if(!board)return null;
 const index=board.index??group.children.findIndex(s=>s.id===subsystem.id),w=1536/board.columns,h=1024/board.rows;
 return {...board,index,x:(index%board.columns)*w,y:Math.floor(index/board.columns)*h,width:w,height:h};
};
ComponentFlow.subsystemLanes=function(c,subsystem){
 const id=subsystem.id,topic={id:id.split('/')[1],label:subsystem.label,taxonomy:[id]};
 const gap='Referências deste ramo ainda não estão associadas ao subsistema no acervo. Pesquisa e validação pendentes.';
 if(id==='ocupantes/materiais'){topic.text='Associação temática de materiais do habitáculo. O acervo não confirma requisitos específicos de espuma.';topic.gaps=['Normas ABNT NBR específicas de espuma e bancos ainda não cadastradas nem verificadas.'];}
 if(id==='propulsao/combustiveis')return [
  {id:'seguranca',label:'Segurança',topics:[{...topic,recordIds:['senatran-118'],text:'Tanques, alteração de capacidade e condições específicas do ato. Conferir fonte e enquadramento.'}]},
  {id:'ambiental',label:'Ambiental e eficiência',topics:[{...topic,recordIds:['mover-007','mover-008','ibama-014'],text:'Combustíveis, eficiência e emissões já classificados neste assunto. Não são requisitos exclusivos do tanque.'}]}
 ];
 if(id==='propulsao/eletrica')return [
  {id:'seguranca',label:'Segurança e conformidade',topics:[topic]},
  {id:'ambiental',label:'Ambiental',topics:[{id:'ambiental',label:'Bateria: ciclo de vida e destinação',recordIds:[],gaps:[gap]}]}
 ];
 const environmental=['propulsao/emissoes','eletronica/obd'].includes(id);
 return [{id:environmental?'ambiental':'seguranca',label:environmental?'Ambiental':'Segurança e conformidade',topics:[topic]}];
};
const originalTopics=ComponentFlow.topics;
ComponentFlow.topics=function(c,hierarchy){
 if(c.lanes)return originalTopics.call(this,c,hierarchy);
 const lanes=new Map();
 for(const sub of this.subsystems(c,hierarchy))for(const lane of this.subsystemLanes(c,sub)){
  if(!lanes.has(lane.id))lanes.set(lane.id,{...lane,topics:[]});
  lanes.get(lane.id).topics.push(...lane.topics);
 }
 return [...lanes.values()];
};
ComponentFlow.coverage=function(hierarchy){
 const expected=hierarchy.filter(g=>g.physical).flatMap(g=>g.children.map(s=>s.id));
 const covered=new Set(vehicleComponents.flatMap(c=>this.subsystems(c,hierarchy).map(s=>s.id)));
 return {systems:hierarchy.filter(g=>g.physical).length,total:expected.length,covered:expected.filter(id=>covered.has(id)).length,missing:expected.filter(id=>!covered.has(id))};
};
if(typeof module!=='undefined')Object.assign(module.exports,{subsystemBoards,specialSubsystemArt});
