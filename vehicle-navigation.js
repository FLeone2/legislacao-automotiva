'use strict';
const vehicleUI={component:null,lane:null,zoom:1};
function vehicleContext(){return `${$('#vehicleType').value} · ${$('#powertrain').value}`;}
function componentArt(c,cls=''){return c.asset?`<img class="${cls}" src="${c.asset}" alt="Ilustração conceitual de ${esc(c.label)}" decoding="async">`:`<svg class="${cls}" viewBox="${c.crop}" role="img" aria-label="${esc(c.label)}"><image href="assets/vehicle-exploded.webp" width="1536" height="1024"/></svg>`;}
function vehicleLink(c,lane){const q=new URLSearchParams({component:c.id});if(lane)q.set('lane',lane);q.set('type',$('#vehicleType').value);q.set('powertrain',$('#powertrain').value);return '#vehicle?'+q;}
function saveVehicleRoute(){const q=new URLSearchParams(location.hash.split('?')[1]||'');q.set('type',$('#vehicleType').value);q.set('powertrain',$('#powertrain').value);history.replaceState(null,'','#vehicle?'+q);}
function selectSystem(id){const c=ComponentFlow.component(id)||vehicleComponents.find(x=>x.taxonomy===id);if(c)goVehicle(vehicleLink(c));}
function goVehicle(url){const update=()=>{history.pushState(null,'',url);render();window.scrollTo({top:0,behavior:'instant'});$('#main h1')?.focus({preventScroll:true});};if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.startViewTransition(update);else update();}
function vehicleMap(){return `<div class="catalog-stage"><svg id="vehicleDrawing" viewBox="0 0 1536 1024" role="group" aria-label="Veículo ilustrado: selecione um componente"><g id="vehicleLayer"><image href="assets/vehicle-exploded.webp" width="1536" height="1024"/><rect x="1100" y="785" width="415" height="230" rx="14" fill="white" stroke="#dde4ec" stroke-width="2"/><image href="assets/tanque.webp" x="1110" y="785" width="395" height="205" preserveAspectRatio="xMidYMid meet"/><text x="1307" y="1000" text-anchor="middle" fill="#536579" font-size="20" font-family="Arial">Tanque e circuito de vapores</text>${vehicleComponents.map(c=>`<a href="${esc(vehicleLink(c))}" data-component-link="${c.id}" aria-label="Explorar normas: ${esc(c.label)}"><path class="component-region" d="${c.path}"><title>${esc(c.label)}</title></path></a>`).join('')}</g></svg><div class="vehicle-drawing-tools"><button data-vehicle-zoom="out" aria-label="Diminuir imagem do veículo">−</button><button data-vehicle-zoom="reset" aria-label="Restaurar imagem do veículo"><output id="vehicleImageZoom">100%</output></button><button data-vehicle-zoom="in" aria-label="Ampliar imagem do veículo">+</button></div><output id="componentHover" class="component-hover" aria-live="polite">Selecione um componente do veículo</output><p class="catalog-caption">Ilustração conceitual · SUV genérico. Selecione no desenho ou nos componentes abaixo.</p></div>`;}
function renderVehicle(){
 $('#main').onpointerover=null;$('#main').onfocusin=null;$('#main').onpointerleave=null;
 const q=new URLSearchParams(location.hash.split('?')[1]||'');
 for(const [key,id] of [['type','vehicleType'],['powertrain','powertrain']]){const value=q.get(key);if(value&&[...$('#'+id).options].some(o=>o.value===value))$('#'+id).value=value;}
 const c=ComponentFlow.component(q.get('component'));
 vehicleUI.component=c?.id||null;
 $('#app').classList.toggle('tree-mode',Boolean(c));$('#app').classList.toggle('vehicle-flow-mode',Boolean(c));$('#app').classList.toggle('vehicle-overview-mode',!c);
 if(c){initializeComponentTree(c,q);renderVehicleFlow();return;}
 restoreAssistantPanel();
 $('#main').innerHTML=`<header class="vehicle-page-heading"><div><p class="vehicle-kicker">Exploração por componentes</p><h1 tabindex="-1">O veículo como ponto de partida.</h1><p>Escolha uma parte para explorar suas legislações e normas.</p></div><div class="vehicle-profile"><span>Perfil de consulta</span><strong>${esc(vehicleContext())}</strong></div></header>${q.has('component')?'<p class="notice" role="status">Componente não encontrado. Escolha uma das opções do veículo.</p>':''}${vehicleMap()}<section class="component-directory" aria-labelledby="componentDirectory"><div class="section-heading"><h2 id="componentDirectory">Qual componente você quer explorar?</h2><span>${vehicleComponents.length} entradas visuais</span></div><div class="component-cards">${vehicleComponents.map(c=>`<a class="component-card" href="${esc(vehicleLink(c))}" data-component-link="${c.id}"><div class="component-card-art">${componentArt(c)}</div><div class="component-card-copy"><strong>${esc(c.label)}</strong><span>${ComponentFlow.topics(c,catalog.metadata.hierarchy).map(l=>l.label).join(' · ')}</span></div><span class="component-card-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section><p class="scope-note">A seleção organiza a consulta por assunto. O perfil ilustrativo não determina aplicabilidade. As ilustrações são próprias, geradas para navegação, e não identificam um modelo real.</p>`;
 vehicleUI.zoom=1;setupComponentHover();
}
function initializeComponentTree(c,q){
 const lanes=ComponentFlow.topics(c,catalog.metadata.hierarchy);const lane=lanes.find(x=>x.id===q.get('lane'))||lanes[0];vehicleUI.lane=lane.id;
 const laneNodes=lanes.map(l=>branch(`component:${c.id}:${l.id}`,l.label,'Caminho de consulta',l.id==='ambiental'?'♧':'◇',l.topics.map(t=>{
  const records=ComponentFlow.records(t,catalog.records),id=`component:${c.id}:${l.id}:${t.id}`;
  const leaves=records.map(r=>({id:`${id}:record:${r.id}`,label:r.title,subtitle:r.issuer||r.agency,icon:'▤',kind:'Referência do acervo',recordId:r.id,recordIds:[r.id],text:r.summary}));
  (t.gaps||[]).forEach((gap,i)=>leaves.push({id:`${id}:gap:${i}`,label:'Mapeamento pendente',subtitle:gap,icon:'!',kind:'Lacuna do acervo',recordIds:[],text:gap}));
  if(!leaves.length)leaves.push({id:`${id}:empty`,label:'Sem referência cadastrada',subtitle:'Pesquisa e validação pendentes',icon:'!',kind:'Lacuna do acervo',recordIds:[],text:'Ainda não há referência associada a este assunto no acervo. Nenhuma norma foi inferida a partir da ilustração.'});
  return {id,label:t.label,subtitle:`${records.length} referências${t.gaps?.length?' · mapeamento parcial':''}`,icon:'◇',kind:'Assunto do componente',recordIds:records.map(r=>r.id),text:t.text||'Associação temática já registrada no acervo. Verifique o objeto, as condições e os anexos nas fontes.',children:leaves};
 })));
 const root=branch(`component:${c.id}`,c.label,'Componente selecionado','▱',laneNodes,'Componente do veículo');treeModels.vehicle=indexTree(root);
 const lid=`component:${c.id}:${lane.id}`,first=treeModels.vehicle.nodes[lid].children[0];
 const node=q.get('node');const valid=node&&treeModels.vehicle.nodes[node]&&(node===root.id||node===lid||node.startsWith(lid+':'));
 treeUI.vehicle={path:valid?nodeTrail(node,treeModels.vehicle):[root.id,lid,first.id],selected:valid?node:first.id,zoom:1,tab:'summary',fit:true};
}
function renderVehicleFlow(){
 const c=ComponentFlow.component(vehicleUI.component);if(!c)return renderVehicle();
 const model=treeModels.vehicle,ui=treeUI.vehicle,lanes=ComponentFlow.topics(c,catalog.metadata.hierarchy);
 const q=new URLSearchParams(location.hash.split('?')[1]||'');q.set('component',c.id);q.set('lane',vehicleUI.lane);q.set('node',ui.selected);history.replaceState(null,'','#vehicle?'+q);
 $('#main').innerHTML=`<nav class="component-breadcrumb" aria-label="Caminho selecionado"><a href="#vehicle" data-vehicle-back>← Voltar ao veículo</a><span> / </span><strong>${esc(c.label)}</strong></nav><header class="component-flow-heading"><div class="component-hero-art">${componentArt(c)}</div><div><p class="vehicle-kicker">${esc(vehicleContext())}</p><h1 tabindex="-1">${esc(c.label)}</h1><p>Do componente ao assunto.<br>Do assunto à fonte.</p></div></header><nav class="component-lanes" aria-label="Área regulatória">${lanes.map(l=>`<a href="${esc(vehicleLink(c,l.id))}" data-component-link="${c.id}" class="${vehicleUI.lane===l.id?'active':''}" ${vehicleUI.lane===l.id?'aria-current="page"':''}><span>${l.id==='ambiental'?'♧':'◇'}</span>${esc(l.label)}</a>`).join('')}</nav><div class="tree-breadcrumb" aria-label="Ramo do fluxograma">${nodeTrail(ui.selected,model).map(id=>`<button data-tree-node="${esc(id)}">${esc(model.nodes[id].label)}</button>`).join('<span>›</span>')}</div><section class="graph-shell component-graph" aria-label="Fluxograma de normas de ${esc(c.label)}">${graphMarkup(model,ui)}</section><div class="tree-footer"><span>ⓘ</span><span>Abra os ramos e selecione uma norma. Arraste o fundo ou deslize para navegar. Conexões indicam associação temática.</span><button data-graph-action="reset">Recomeçar</button></div><p class="scope-note">O acervo não certifica vigência ou aplicabilidade. Lacunas, inclusive normas NBR ainda não cadastradas, aparecem como mapeamento pendente.</p>`;
 renderTreeDetails();setupGraph();
}
function setupComponentHover(){
 const stage=$('.catalog-stage');if(!stage)return;
 const show=id=>{document.querySelectorAll('[data-component-link]').forEach(el=>el.classList.toggle('is-hovered',el.dataset.componentLink===id));const c=ComponentFlow.component(id);if($('#componentHover'))$('#componentHover').textContent=c?`${c.label} · explorar normas`:'Selecione um componente do veículo';};
 $('#main').onpointerover=e=>{const link=e.target.closest('[data-component-link]');if(link)show(link.dataset.componentLink);};
 $('#main').onfocusin=e=>{const link=e.target.closest('[data-component-link]');if(link)show(link.dataset.componentLink);};
 $('#main').onpointerleave=()=>show(null);
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{const zoom=e.target.closest('[data-vehicle-zoom]');if(zoom){vehicleUI.zoom=zoom.dataset.vehicleZoom==='reset'?1:Math.max(1,Math.min(2.4,Math.round((vehicleUI.zoom+(zoom.dataset.vehicleZoom==='in'?.2:-.2))*10)/10));$('#vehicleLayer').setAttribute('transform',`translate(768 512) scale(${vehicleUI.zoom}) translate(-768 -512)`);$('#vehicleImageZoom').textContent=Math.round(vehicleUI.zoom*100)+'%';return;}const link=e.target.closest('[data-component-link],[data-vehicle-back]');if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goVehicle(link.getAttribute('href'));});
 document.addEventListener('error',e=>{if(!e.target.matches?.('img,image'))return;const parent=e.target.closest('.component-card-art,.component-hero-art,.catalog-stage');if(!parent||parent.querySelector('.image-unavailable'))return;const note=document.createElement('p');note.className='image-unavailable';note.setAttribute('role','status');note.textContent='Imagem indisponível. Use o nome do componente para navegar.';parent.append(note);},true);
 window.addEventListener('popstate',()=>{if(location.hash.startsWith('#vehicle'))render();});
}
