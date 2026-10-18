'use strict';
// Taxonomy IDs, rather than ASA PNCs, link graphics, controls and legal records.
const VehicleModel={
  available(hierarchy,systems){const ids=new Set(systems);return hierarchy.flatMap(g=>g.children.filter(c=>ids.has(g.id)||ids.has(c.id)));},
  toggle(values,id){return values.includes(id)?values.filter(x=>x!==id):[...values,id];},
  prune(groups,available){const ids=new Set(available.map(x=>x.id));return groups.filter(id=>ids.has(id));},
  records(records,id){return records.filter(r=>(r.taxonomy||[]).some(t=>t===id||t.startsWith(id+'/')));},
  zoom(value){return Math.max(1,Math.min(3,Math.round(value*10)/10));}
};
if(typeof module!=='undefined')module.exports=VehicleModel;
const vehicleUI={systems:[],groups:[],illustration:null,selected:[],zoom:1};
const brakePoints=[{id:'freios/frenagem',x:260,y:285},{id:'freios/estabilidade',x:585,y:280},{id:'freios/fluido',x:695,y:135}];
function vehicleContext(){return `${$('#vehicleType').value} · ${$('#powertrain').value}`;}
function vehicleAvailable(){return VehicleModel.available(catalog.metadata.hierarchy,vehicleUI.systems);}
function readVehicleRoute(){
 const q=new URLSearchParams(location.hash.split('?')[1]||'');
 const h=catalog.metadata.hierarchy,systems=new Set(h.flatMap(g=>[g.id,...g.children.map(c=>c.id)]));
 vehicleUI.systems=[...new Set((q.get('systems')||'').split(',').filter(x=>systems.has(x)))];
 vehicleUI.groups=VehicleModel.prune([...new Set((q.get('groups')||'').split(','))],vehicleAvailable());
 const next=q.get('illustration');
 if(next!==vehicleUI.illustration){vehicleUI.selected=[];vehicleUI.zoom=1;}
 vehicleUI.illustration=vehicleUI.groups.includes(next)?next:null;
 for(const [key,id] of [['type','vehicleType'],['powertrain','powertrain']]){const value=q.get(key);if(value&&[...$('#'+id).options].some(o=>o.value===value))$('#'+id).value=value;}
}
function saveVehicleRoute(){
 const q=new URLSearchParams();
 if(vehicleUI.systems.length)q.set('systems',vehicleUI.systems.join(','));
 if(vehicleUI.groups.length)q.set('groups',vehicleUI.groups.join(','));
 if(vehicleUI.illustration)q.set('illustration',vehicleUI.illustration);
 q.set('type',$('#vehicleType').value);q.set('powertrain',$('#powertrain').value);
 const next='#vehicle?'+q; if(location.hash!==next)history.pushState(null,'',next);
}
function refreshVehicle(focus){saveVehicleRoute();renderVehicle();renderRelated();if(focus)document.querySelector(focus)?.focus({preventScroll:true});}
function selectSystem(id,fromKeyboard=false){
 if(!groupFor(id))return;
 vehicleUI.systems=VehicleModel.toggle(vehicleUI.systems,id);
 vehicleUI.groups=VehicleModel.prune(vehicleUI.groups,vehicleAvailable());
 vehicleUI.illustration=null;vehicleUI.selected=[];vehicleUI.zoom=1;state.component=id;
 refreshVehicle(fromKeyboard?`[data-part="${id}"]`:null);
}
function vehicleMap(){return `<div class="visual-overview"><svg viewBox="0 0 1536 1024" role="group" aria-label="Regiões do veículo ilustrativo"><image href="vehicle.png" width="1536" height="1024" aria-hidden="true"/>${mapRegions.map(r=>`<path d="${r.d}" class="vehicle-part ${vehicleUI.systems.includes(r.id)?'selected':''}" data-part="${r.id}" tabindex="0" role="button" aria-pressed="${vehicleUI.systems.includes(r.id)}" aria-label="${esc(r.label)}"><title>${esc(r.label)}</title></path>`).join('')}</svg><p class="scope-note">Ilustração geral do projeto. Clique nas regiões ou use os sistemas ao lado. Seleções se acumulam.</p></div>`;}
function vehicleThumbnail(c){const brake=c.id.startsWith('freios/');const region=mapRegions.find(r=>r.id===c.id)||mapRegions.find(r=>r.id===c.id.split('/')[0]);return brake?'<img src="assets/brake-schematic.svg" alt="Esquema conceitual do sistema de freios" loading="lazy">':region?`<svg viewBox="0 0 1536 1024" aria-label="Localização ilustrativa no veículo"><image href="vehicle.png" width="1536" height="1024"/><path d="${region.d}" fill="#ed1d2340" stroke="#ba1535" stroke-width="12"/></svg>`:'<span class="no-graphic">Sem miniatura disponível</span>';}
function renderVehicle(){
 readVehicleRoute();
 const h=catalog.metadata.hierarchy||[];
 $('#main').innerHTML=`<div class="eyebrow">Consulta visual · Brasil</div><h1>Do veículo à referência</h1><div class="vehicle-context"><span aria-hidden="true">▱</span><div><strong>${esc(vehicleContext())}</strong><small>Perfil ilustrativo do projeto · sem identificação de modelo ou VIN</small></div></div><p class="subtitle">Explore sistemas e selecione subsistemas para abrir a consulta visual.</p><nav class="visual-trail" aria-label="Percurso do veículo"><button data-visual="back">Veículo</button><span>›</span><button data-visual="back">Sistemas e subsistemas</button>${vehicleUI.illustration?`<span>›</span><strong>${esc(systemLabel(vehicleUI.illustration))}</strong>`:''}</nav><div id="visualContent">${vehicleUI.illustration?vehicleDetail():vehicleGroups(h)}</div>`;
 if(vehicleUI.illustration){const svg=$('#detailDrawing');svg?.addEventListener('wheel',e=>{e.preventDefault();changeVehicleZoom(e.deltaY<0?.2:-.2);},{passive:false});}

}
function vehicleGroups(h){
 const available=vehicleAvailable();
 return `<div class="visual-picker">${vehicleMap()}<aside class="visual-systems"><h2>Sistemas</h2><p>Selecione um ou mais.</p>${h.filter(g=>g.physical).map(g=>`<button data-visual-system="${g.id}" aria-pressed="${vehicleUI.systems.includes(g.id)}"><span>${esc(g.label)}</span><small>${g.children.length} subsistemas</small><b aria-hidden="true">${vehicleUI.systems.includes(g.id)?'✓':'+'}</b></button>`).join('')}</aside></div><section class="visual-groups" aria-labelledby="subsystemTitle"><div class="section-heading"><h2 id="subsystemTitle">Subsistemas</h2><span role="status">${available.length} disponíveis · ${vehicleUI.groups.length} selecionados</span></div><p class="scope-note">Selecione os cards e use “Abrir ilustração”. Os códigos abaixo são identificadores da taxonomia regulatória do projeto.</p><div class="visual-cards">${available.map(c=>`<button class="visual-card ${vehicleUI.groups.includes(c.id)?'active':''}" data-visual-group="${c.id}" aria-pressed="${vehicleUI.groups.includes(c.id)}"><div class="visual-thumb">${vehicleThumbnail(c)}</div><small>${esc(c.id)}</small><strong>${esc(c.label)}</strong><span>${vehicleUI.groups.includes(c.id)?'✓ Selecionado':'Selecionar'} · ${systemCount(c.id)} referências</span></button>`).join('')||'<p class="visual-empty" role="status">Selecione uma região do carro ou um sistema para ver os subsistemas associados.</p>'}</div><div class="visual-actions"><button class="btn" data-visual="clear">Limpar seleção</button><button class="btn" data-visual="all" ${available.length?'':'disabled'}>Selecionar todos os subsistemas</button><button class="btn primary" data-visual="open" ${vehicleUI.groups.length?'':'disabled'}>Abrir ilustração (${vehicleUI.groups.length}) →</button></div></section><details class="visual-other"><summary>Processos e temas além do mapa físico</summary><p class="scope-note">Temas regulatórios sem correspondência obrigatória a uma peça.</p>${h.filter(g=>!g.physical).map(g=>`<button class="btn" data-visual-system="${g.id}" aria-pressed="${vehicleUI.systems.includes(g.id)}">${esc(g.label)} ${vehicleUI.systems.includes(g.id)?'✓':'+'}</button>`).join('')}</details>`;
}
function vehicleDetail(){
 const current=vehicleUI.illustration,g=groupFor(current),brake=g.id==='freios';
 const rows=g.children;const selected=rows.filter(c=>vehicleUI.selected.includes(c.id));
 const refs=[...new Map(selected.flatMap(c=>VehicleModel.records(catalog.records,c.id)).map(r=>[r.id,r])).values()];
 return `<section class="visual-detail"><div class="visual-detail-head"><button class="text-button" data-visual="back">← Voltar aos grupos</button><h2>${esc(systemLabel(current))}</h2><span class="pill">${esc(current)}</span></div><div class="visual-illustration-tabs" aria-label="Grupos selecionados">${vehicleUI.groups.map(id=>`<button data-visual-illustration="${id}" aria-pressed="${id===current}">${esc(systemLabel(id))}</button>`).join('')}</div><p class="scope-note">${brake?'Esquema conceitual próprio, em vista separada. Não é desenho técnico de um modelo real. Os pontos representam assuntos da taxonomia, não PNCs ou números comerciais.':'Não há ilustração detalhada e mapa de hotspots disponíveis para este sistema. A consulta textual aos assuntos e às referências permanece disponível.'}</p><div class="visual-detail-grid"><div class="drawing-panel">${brake?`<div class="drawing-tools"><button class="btn" data-visual="minus" aria-label="Diminuir zoom">−</button><button class="btn" data-visual="reset" aria-label="Restaurar enquadramento">100% · Restaurar</button><button class="btn" data-visual="plus" aria-label="Aumentar zoom">+</button><output id="visualZoom" aria-live="polite">${Math.round(vehicleUI.zoom*100)}%</output></div><svg id="detailDrawing" viewBox="0 0 900 520" role="group" aria-label="Esquema conceitual interativo de freios"><g id="drawingTransform" transform="translate(450 260) scale(${vehicleUI.zoom}) translate(-450 -260)"><image href="assets/brake-schematic.svg" width="900" height="520"/>${brakePoints.map((p,i)=>`<g class="topic-hotspot ${vehicleUI.selected.includes(p.id)?'active':''}" data-visual-topic="${p.id}" tabindex="0" role="button" aria-pressed="${vehicleUI.selected.includes(p.id)}" aria-label="${esc(systemLabel(p.id))}" transform="translate(${p.x} ${p.y})"><circle r="30"/><text text-anchor="middle" dy="7">${i+1}</text><title>${esc(systemLabel(p.id))}</title></g>`).join('')}</g></svg>`:'<div class="visual-empty">Ilustração detalhada indisponível.<br>Selecione os assuntos na lista ao lado para consultar o acervo.</div>'}</div><section class="topic-panel" aria-label="Assuntos do sistema"><h3>Componentes e assuntos</h3><p class="scope-note">Desenho e lista compartilham os mesmos identificadores.</p>${rows.map((c,i)=>`<button class="visual-topic ${vehicleUI.selected.includes(c.id)?'active':''}" data-visual-topic="${c.id}" aria-pressed="${vehicleUI.selected.includes(c.id)}"><b>${i+1}</b><span><small>${esc(c.id)}</small><strong>${esc(c.label)}</strong><small>${systemCount(c.id)} referências · ${vehicleUI.selected.includes(c.id)?'Selecionado':'Selecionar'}</small></span></button>`).join('')||'<p role="status">Nenhum assunto cadastrado neste sistema.</p>'}<button class="btn" data-visual="clear-topics">Limpar assuntos selecionados</button></section></div><section class="visual-references" aria-labelledby="visualRefsTitle"><h3 id="visualRefsTitle">Legislações dos assuntos selecionados</h3><p class="scope-note">Associações temáticas já cadastradas no projeto. Confirme vigência e aplicabilidade na fonte oficial.</p><div role="status">${selected.length} assuntos selecionados · ${refs.length} referências</div>${refs.map(documentCard).join('')||`<p class="visual-empty">${selected.length?'Nenhuma referência associada no acervo aos assuntos selecionados.':'Selecione um ponto do desenho ou um assunto na lista para ver suas referências.'}</p>`}</section></section>`;
}
function changeVehicleZoom(delta){vehicleUI.zoom=VehicleModel.zoom(vehicleUI.zoom+delta);$('#drawingTransform')?.setAttribute('transform',`translate(450 260) scale(${vehicleUI.zoom}) translate(-450 -260)`);if($('#visualZoom'))$('#visualZoom').textContent=Math.round(vehicleUI.zoom*100)+'%';}
function handleVisual(target){
 if(target.dataset.visualSystem){selectSystem(target.dataset.visualSystem);return;}
 if(target.dataset.visualGroup){vehicleUI.groups=VehicleModel.toggle(vehicleUI.groups,target.dataset.visualGroup);refreshVehicle(`[data-visual-group="${target.dataset.visualGroup}"]`);return;}
 if(target.dataset.visualTopic){const id=target.dataset.visualTopic;vehicleUI.selected=VehicleModel.toggle(vehicleUI.selected,id);state.component=id;refreshVehicle(`[data-visual-topic="${id}"]`);return;}
 if(target.dataset.visualIllustration){vehicleUI.illustration=target.dataset.visualIllustration;vehicleUI.selected=[vehicleUI.illustration];vehicleUI.zoom=1;refreshVehicle();return;}
 const action=target.dataset.visual;
 if(['plus','minus','reset'].includes(action)){changeVehicleZoom(action==='reset'?1-vehicleUI.zoom:action==='plus'?.2:-.2);return;}
 if(action==='clear'){vehicleUI.systems=[];vehicleUI.groups=[];vehicleUI.selected=[];vehicleUI.illustration=null;}
 if(action==='all')vehicleUI.groups=vehicleAvailable().map(c=>c.id);
 if(action==='open'){vehicleUI.illustration=vehicleUI.groups[0];vehicleUI.selected=[vehicleUI.illustration];vehicleUI.zoom=1;state.component=vehicleUI.illustration;}
 if(action==='back'){vehicleUI.illustration=null;vehicleUI.selected=[];vehicleUI.zoom=1;}
 if(action==='clear-topics')vehicleUI.selected=[];
 refreshVehicle(action==='open'?'[data-visual="back"]':null);
}
if(typeof document!=='undefined'){
 document.addEventListener('error',e=>{
  if(!e.target.matches?.('img,image'))return;
  const container=e.target.closest('.visual-thumb,.drawing-panel,.visual-overview');if(!container)return;
  (e.target.closest('svg')||e.target).style.display='none';
  if(!container.querySelector('.no-graphic')){const message=document.createElement('p');message.className='no-graphic';message.setAttribute('role','status');message.textContent='Imagem indisponível. Use a lista textual para navegar.';container.append(message);}
 },true);
 document.addEventListener('click',e=>{const target=e.target.closest('[data-visual],[data-visual-system],[data-visual-group],[data-visual-topic],[data-visual-illustration]');if(target)handleVisual(target);});
 document.addEventListener('keydown',e=>{const target=e.target.closest('g[data-visual-topic]');if(target&&['Enter',' '].includes(e.key)){e.preventDefault();handleVisual(target);}});
 window.addEventListener('popstate',()=>{if(location.hash.startsWith('#vehicle')){renderVehicle();renderRelated();}});
}
