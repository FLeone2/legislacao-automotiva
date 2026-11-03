import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'outputs','revisao-seguranca-2026-11-02');
const preview=path.join(root,'work','previas-residuais');
await fs.mkdir(preview,{recursive:true});
const residual=JSON.parse(await fs.readFile(path.join(folder,'pendencias-residuais.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifesto-fontes.json'),'utf8'));
const bySource=Object.fromEntries(manifest.documentos.map(x=>[x.id,x]));
const refs=(...ids)=>ids.map(id=>{
 assert(bySource[id],`Fonte ausente: ${id}`);
 return bySource[id].official_url;
}).join('\n');

// Questões de prática e documentação. As respostas não substituem a revisão dos atos.
const questions=[
 ['R01a','Deslocamento da coluna',
  'Você já confirmou o uso de UN R/FMVSS. Qual norma e qual relatório usa nesta linha do SISCAT? É arquivo próprio ou o mesmo relatório do impacto frontal? Se souber, indique o campo/trecho que cobre o deslocamento.',
  '910/2022, art. 6º; Portaria SENATRAN 990/2022, Anexo XI. O art. 6º cita FMVSS 203/208/301 e UN R32/R34/R94; não cita FMVSS 204.',
  'Conferir a norma indicada, a cobertura e o fundamento da entrega própria ou compartilhada.'],
 ['R01b','Absorção de energia da direção',
  'Para a linha de direção absorvedora de energia, qual norma e documento você costuma apresentar? Informe se compartilha o relatório frontal ou usa outro. Não precisa repetir que UN R/FMVSS são aceitos.',
  '910/2022, art. 6º; Portaria SENATRAN 990/2022, Anexo XI. A dúvida é a cobertura documental da linha antiga.',
  'Relacionar o documento à linha e conferir suas condições de aceitação.'],
 ['R01c','Mangueiras de freio',
  'A referência 915/2022 já está registrada. Na prática, você entrega relatório próprio de mangueiras ou usa o relatório do sistema de freios? Qual norma/trecho identifica a cobertura do componente?',
  '915/2022, art. 4º; Portaria SENATRAN 990/2022, Anexo XI, item 1.3. Exigência de arquivo autônomo ainda não demonstrada.',
  'Conferir a cobertura informada sem criar nem dispensar relatório separado por inferência.'],
 ['R02','Quebra-mato: registro e plaqueta',
  'No procedimento atual que você conhece, o fornecedor apresenta número de registro Inmetro ou somente declaração/LAV? O que consta na plaqueta? Se tiver, indique orientação oficial ou modelo em branco que esclareça isso.',
  'CONTRAN 215/2006, arts. 3º e 5º; Inmetro 400/2020; Inmetro 282/2020, art. 2º, I e Tabela 1. Conformidade do fornecedor já identificada.',
  'Sanear a interface entre referência a registro/plaqueta e dispensa de ato de liberação por risco I.'],
 ['R03a','MOVER: AEB para ciclistas (C2)',
  'Você conhece retificação ou orientação oficial que esclareça o parágrafo do C2 que fala em monitoramento de motoristas? Se sim, indique ato/link. Se não conhecer, escreva “Não sei”; vou manter a busca.',
  'GM/MDIC 215/2025, Anexo II, C2. O texto mistura ciclistas e monitoramento do motorista na alternativa temporária até setembro/2026.',
  'Verificar eventual correção. Não corrigir o texto por conta própria nem oferecer prazo temporário como aberto.'],
 ['R03b','MOVER: requisitos do Grupo D',
  'Você conhece ato já publicado que tenha definido os critérios técnicos ou substituições do Grupo D? Se conhecer, indique número, data e link. Não basta minuta ou discussão de grupo de trabalho.',
  'Decreto 12.435/2025, Anexo IV; GM/MDIC 215/2025, art. 5º, § 1º, e Anexo II, Grupo D.',
  'Conferir o ato indicado e seu alcance. Sem ato verificado, manter Grupo D condicionado.'],
 ['R04','Fontes e edições dos métodos',
  'Você já tem uma lista de normas/edições ou fontes autorizadas que usa para UN R, FMVSS, UE, ABNT, ISO e SAE? Indique o que já tem disponível e onde consultar. Pode informar também ato recente que ainda não conste da nossa revisão.',
  'Normas incorporadas pelos atos CONTRAN e GM/MDIC 215/2025, Anexo II. Revisão atual dos índices não certifica todas as publicações posteriores.',
  'Montar inventário de versões/acesso e conferir atos posteriores. Essa pesquisa continua comigo, mesmo sem material seu.'],
 ['R05a','Diesel no automóvel M1',
  'Você conhece caso de automóvel M1 novo nacional a diesel que deva entrar na consulta? Se sim, descreva tipo/carroçaria, capacidade de transporte e fundamento da autorização/exceção. Se não conhecer, informe isso.',
  'Portaria DNC 23/1994, art. 1º e exceções. A cadeia atual e as exceções ainda precisam ser saneadas; o seletor do SISCAT não autoriza o combustível.',
  'Conferir restrição/exceção e sua vigência. Manter todas as propulsões na arquitetura já definida.'],
 ['R05b','Hidrogênio e outros gases',
  'Para hidrogênio/célula a combustível ou outro gás além de GNV, você conhece ato brasileiro vigente ou homologação de referência que possa indicar? Informe tecnologia e documento público, se tiver. Sem referência, escreva “Não sei”.',
  'Regras específicas da tecnologia a identificar. A 749/2018 trata da segurança elétrica aplicável; consulta/projeto de hidrogênio não prova aprovação vigente.',
  'Pesquisar e conferir a regra específica. Não estender automaticamente o regulamento GNV a outros gases.'],
 ['R06','Peças necessárias no 3D',
  'No modelo 3D existente, falta alguma peça ou sistema essencial para explicar a segurança? Diga o nome do componente e o que precisa ficar visível ou selecionável. Não é necessário informar códigos de malha.',
  'Requisito de produto e visualização. Dez guias já capturadas; uniformidade dos outros perfis já informada por você. Nenhuma nova confirmação disso é pedida.',
  'Conferir as peças do arquivo 3D e seus vínculos na implementação. A associação real não será considerada pronta pela resposta.'],
];

const referenceRows=[
 ['R01','Direção e mangueiras',
  'Ligações com 910/2022 e 915/2022 identificadas. Falta demonstrar a entrega autônoma das linhas antigas.',
  'Conferir método, trecho coberto e instrução vigente da Senatran sobre o arquivo próprio/compartilhado.',
  'R01a, R01b, R01c: indicar prática e norma/documento utilizado.',
  'Correspondência e fundamento documental.',
  refs('contran-910-2022','contran-915-2022','portaria-senatran-990-2022-republicacao')],
 ['R02','Quebra-mato',
  '215/2006 menciona registro/plaqueta. 282/2020 classifica a atividade no risco I. 400/2020 usa declaração/autoverificação.',
  'Conferir tratamento administrativo atual do número de registro e da plaqueta entre os dois órgãos.',
  'R02: indicar modelo ou orientação pública, caso conheça.',
  'Interface administrativa entre os atos.',
  refs('contran-215-2006-html','inmetro-282-2020','inmetro-400-2020-http')],
 ['R03','MOVER: C2 e Grupo D',
  'C2 tem redação inconsistente em alternativa temporária. Grupo D depende de viabilidade e definição técnica.',
  'Buscar esclarecimento/retificação de C2 e atos efetivos sobre Grupo D. Prazo temporário de setembro/2026 não será tratado como aberto.',
  'R03a e R03b: indicar atos publicados, se conhecer.',
  'Redação aplicável e definição dos critérios.',
  refs('mdic-215-2025-dou-p26','mdic-215-2025-dou-p28','decreto-12435-2025-dou-p5')],
 ['R04','Atualidade e textos dos métodos',
  'Índices CONTRAN e SENATRAN consultados têm datas de atualização próprias. Nem todos os textos técnicos foram reunidos integralmente.',
  'Verificar publicações posteriores e inventariar documentos, edições, acesso e profundidade de revisão.',
  'R04: indicar materiais/fontes que já usa. Pesquisa restante é do assistente.',
  'Atualidade e cobertura documental.',
  refs('contran-indice-novembro','senatran-portarias-2026','mdic-215-2025-dou-p27','mdic-215-2025-dou-p28')],
 ['R05','Propulsões especiais e diesel',
  'Todas as propulsões cabem na arquitetura confirmada. Segurança elétrica/híbrida e GNV foram aprofundadas. Outras cadeias permanecem condicionais.',
  'Sanear cadeia atual/exceções de diesel e identificar regras específicas de outros gases/tecnologias.',
  'R05a e R05b: indicar casos ou atos que conheça.',
  'Enquadramento e regras da tecnologia.',
  refs('dnc-23-1994-reproducao-camara','contran-749-2018','contran-280-2008')],
 ['R06','Interface e vínculo real com o 3D',
  'A captura é de um exemplo; a uniformidade dos perfis foi informada pelo usuário. As relações de peças ainda são semânticas.',
  'Conferir o arquivo 3D, peças, seleção e desempenho durante a implementação. Preservar consulta sem carregar o modelo.',
  'R06: indicar necessidades de visualização. Não é necessário repetir a confirmação dos perfis.',
  'Implementação e verificação visual.',
  'Inventário v2 de 02/11/2026; captura SISCAT de 31/10/2026; orientação expressa do usuário.'],
];
assert.deepEqual(residual.map(x=>x.id),referenceRows.map(x=>x[0]));
assert.equal(questions.length,10);

const wb=Workbook.create();
const main=wb.worksheets.add('Responder');
const research=wb.worksheets.add('Pesquisa e fontes');
const font='Arial',ink='#1D2D41',muted='#5E6B79',navy='#183B59',blue='#1456A0',pale='#EAF3FF';

function setup(sheet,last,widths,title,instruction){
 sheet.showGridLines=false;
 sheet.getRange(`A1:G${last}`).format={font:{name:font,size:11,color:ink},verticalAlignment:'top'};
 widths.forEach((w,i)=>sheet.getRangeByIndexes(0,i,last,1).format.columnWidthPx=w);
 sheet.getRange('A2').values=[[title]];
 sheet.getRange('A2').format.font={name:font,size:16,color:navy,bold:true};
 sheet.getRange('A2:G2').format.rowHeight=29;
 sheet.getRange('A2:G2').format.borders={bottom:{style:'thin',color:'#BBC9D6'}};
 sheet.getRange('A3').values=[[instruction]];
 sheet.getRange('A3:G3').format.rowHeight=23;
 sheet.getRange('A3').format.font={name:font,size:11,color:muted};
 sheet.freezePanes.freezeRows(7);
 sheet.freezePanes.freezeColumns(2);
}
setup(main,17,[70,190,435,390,285,365,185],
 'Pendências residuais de segurança',
 '02/11/2026. Preencha as colunas D e E em azul. Você pode responder “Não sei”. A pesquisa normativa continua comigo.');
main.tabColor=navy;
main.getRange('A4').values=[['Escopo já confirmado: M1 novo nacional, sete ocupantes incluindo motorista, consulta de todas as propulsões. Resposta registrada ainda exige conferência.']];
main.getRange('A4:G4').format.rowHeight=23;
main.getRange('A4').format.font={name:font,size:11,color:muted};
main.getRange('B5').values=[['Respostas registradas']];
main.getRange('B5').format.font={name:font,size:11,bold:true,color:ink};
main.getRange('C5').formulas=[['=COUNTIF(G8:G17,"Resposta registrada")']];
main.getRange('C5').format={numberFormat:'0',horizontalAlignment:'left'};
main.getRange('D5').values=[['de 10 perguntas. “Registrada” não significa legislação validada.']];
main.getRange('D5').format.font={name:font,size:11,color:muted};
main.getRange('A7:G7').values=[['ID','Assunto','Minha dúvida / o que responder','Sua resposta','Documento, ato ou link (se tiver)','Base legal / ponto ainda em dúvida','Acompanhamento']];
main.getRange('A8:G17').values=questions.map(q=>[q[0],q[1],q[2],'','',q[3],'']);
main.tables.add('A7:G17',true,'RespostasResiduais').showFilterButton=true;
main.getRange('A7:G17').format.wrapText=true;
main.getRange('A7:G7').format={fill:navy,font:{name:font,size:11,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',rowHeight:40,wrapText:true};
questions.forEach((q,i)=>{
 const r=8+i;
 main.getRange(`A${r}:G${r}`).format={fill:i%2?'#F4F6F8':'#FFFFFF',rowHeight:120,verticalAlignment:'top',wrapText:true};
 main.getRange(`A${r}`).format.font={name:font,size:11,bold:true,color:navy};
 main.getRange(`D${r}:E${r}`).format={fill:pale,font:{name:font,size:11,color:blue},wrapText:true};
 main.getRange(`G${r}`).formulas=[[`=IF(LEN(TRIM(D${r}&E${r}))=0,"Aguardando resposta","Resposta registrada")`]];
});
main.getRange('G8:G17').conditionalFormats.add('containsText',{text:'Aguardando',format:{fill:'#FFF3DB',font:{color:'#8C5A12'}}});

setup(research,13,[70,210,380,430,315,240,570],
 'Pesquisa normativa e referências',
 'Seis pendências originais, com ações do assistente e fontes consultadas em 02/11/2026. Você responde na primeira guia.');
research.getRange('A4').values=[['As pendências não impedem desenhar a árvore informativa. A confirmação normativa e a ligação real ao 3D permanecem tarefas específicas.']];
research.getRange('A4').format.font={name:font,size:11,color:muted};
research.getRange('A4:G4').format.rowHeight=23;
research.getRange('A7:G7').values=[['Residual','Assunto','O que já foi apurado','Próxima ação do assistente','Como sua resposta ajuda','O que ainda falta concluir','Fontes oficiais / origem']];
research.getRange('A8:G13').values=referenceRows;
research.tables.add('A7:G13',true,'PesquisaResidual').showFilterButton=true;
research.getRange('A7:G13').format.wrapText=true;
research.getRange('A7:G7').format={fill:navy,font:{name:font,size:11,bold:true,color:'#FFFFFF'},rowHeight:40,horizontalAlignment:'center',verticalAlignment:'center',wrapText:true};
referenceRows.forEach((r,i)=>{
 research.getRange(`A${i+8}:G${i+8}`).format={fill:i%2?'#F4F6F8':'#FFFFFF',rowHeight:158,wrapText:true,verticalAlignment:'top'};
 research.getRange(`A${i+8}`).format.font={name:font,size:11,bold:true,color:navy};
 research.getRange(`G${i+8}`).format.font={name:font,size:11,color:blue};
});

// Testar somente o comportamento prometido: registrar resposta, sem encerrar a lei.
wb.recalculate();
assert.equal(main.getRange('C5').values[0][0],0);
main.getRange('D8').values=[['Não sei']];
wb.recalculate();
assert.equal(main.getRange('G8').values[0][0],'Resposta registrada');
assert.equal(main.getRange('C5').values[0][0],1);
main.getRange('D8').clear({applyTo:'contents'});
main.getRange('E8').values=[['Ato de referência para teste']];
wb.recalculate();
assert.equal(main.getRange('C5').values[0][0],1);
main.getRange('E8').clear({applyTo:'contents'});
main.getRange('D8').values=[['   ']];
wb.recalculate();
assert.equal(main.getRange('C5').values[0][0],0);
main.getRange('D8').clear({applyTo:'contents'});
wb.recalculate();
assert.equal(main.getRange('C5').values[0][0],0);
assert(main.getRange('D8:E17').values.flat().every(x=>x==null||x===''));
const inspection=await wb.inspect({kind:'table',range:'Responder!A7:G9',include:'values,formulas',tableMaxRows:3,tableMaxCols:7,maxChars:3500});
await fs.writeFile(path.join(preview,'inspecao.ndjson'),inspection.ndjson);
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:1500});
await fs.writeFile(path.join(preview,'formulas.ndjson'),errors.ndjson);
const file=path.join(folder,'Respostas-pendencias-residuais.xlsx');
await (await SpreadsheetFile.exportXlsx(wb)).save(file);
for(const [sheetName,range,name] of [
 ['Responder','A2:D10','perguntas'],['Responder','D7:G10','respostas'],
 ['Responder','A14:D17','perguntas-finais'],
 ['Pesquisa e fontes','A2:D10','pesquisa'],['Pesquisa e fontes','E7:G10','fontes']]){
 const blob=await wb.render({sheetName,range,scale:1.2,format:'png'});
 await fs.writeFile(path.join(preview,`${name}.png`),new Uint8Array(await blob.arrayBuffer()));
}
await fs.writeFile(path.join(preview,'validacao.json'),JSON.stringify({arquivo:file,perguntas:10,residuais:6,campos_resposta:'Responder!D8:E17',respostas_iniciais:0,respostas_registradas_nao_fecham_revisao:true,testes_restaurados:true},null,2));
console.log(JSON.stringify({arquivo:file,perguntas:10,residuais:6,campos:'D e E, guia Responder'}));
