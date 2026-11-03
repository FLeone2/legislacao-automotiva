import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'outputs', 'fechamento-seguranca');
const workDir = path.join(root, 'work', 'previas-fechamento');
await fs.mkdir(outputDir, {recursive:true});
await fs.mkdir(workDir, {recursive:true});
const inventory = JSON.parse(await fs.readFile(path.join(root,'outputs/levantamento-seguranca/inventario-seguranca.json'),'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(root,'outputs/levantamento-seguranca/manifesto-fontes.json'),'utf8'));
const src = Object.fromEntries(manifest.documentos.map(r=>[r.id,r.official_url]));
const source = (...ids)=>ids.map(id=>src[id]??id).join('\n');
const indexUrl = 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran';
const inmetroUrl = 'https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade';
const faqEngate='https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/avaliacao-da-conformidade/engate/como-obter-a-declaracao-do-fornecedor-de-dispositivo-de-acoplamento-mecanico-engate-para-reboque';
const faqPneus='https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/avaliacao-da-conformidade/pneus-novos/quais-sao-os-regulamentos-sobre-pneus-novos-em-vigor-atualmente';
const faqExtintor='https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/avaliacao-da-conformidade/extintores-de-incendio/quais-sao-os-produtosservicos-na-area-de-prevencao-protecao-e-combate-a-incendios-regulamentados-pelo-inmetro';
const port990='portaria-senatran-990-2022-republicacao';
const port1554='portaria-senatran-1554-2022';

// Questions are open issues, not new interpretations of legal obligations.
const questions = [
 ['C01','Coluna de direção: deslocamento',
  'Na linha “Deslocamento do sistema de coluna de direção”, qual é hoje o fundamento para M1? O CAT exige relatório próprio ou aceita cobertura pelo ensaio de proteção frontal? Qual artigo e método sustentam essa entrega?',
  'A ajuda cita 463/1973, revogada. A 910/2022 é referência do conjunto de proteção frontal, mas a correspondência atual desta linha e a entrega autônoma ainda não estão demonstradas.',
  'CONTRAN 910/2022, art. 6º e anexos. Portaria 990/2022, Anexo XI. Referência histórica: 463/1973.',
  'Você + especialista em CAT',
  'Indicar dispositivo vigente, método e se há relatório próprio ou cobertura por outro documento.',
  'Revisão documental. P-01 / ENS-3-01',source('contran-910-2022',port990)],
 ['C02','Direção: absorção de energia',
  'Para “Sistema de Controle de Direção Absorvedor de Energia”, a comprovação deve ser separada? Quando a alternativa FMVSS 203 do art. 6º da 910/2022 cobre a exigência e quais condições precisam constar no relatório?',
  'Falta delimitar a obrigação, o método aceito e o modo de entrega da linha legada. A menção ao FMVSS 203 não permite presumir que qualquer relatório de impacto frontal já a cobre.',
  'CONTRAN 910/2022, art. 6º. Portaria 990/2022, Anexo XI. Referência histórica: 463/1973.',
  'Você + especialista em CAT',
  'Registrar método, escopo técnico, configurações cobertas e correspondência documental.',
  'Revisão documental. P-01 / ENS-3-02',source('contran-910-2022',port990)],
 ['C03','Ancoragem dos assentos',
  'A base atual é a 951/2022 com a 997/2023. Para a linha “Ancoragem dos assentos”, o método do conjunto banco/apoio de cabeça é suficiente? Qual cobertura do relatório atende essa linha, separando assento, cinto e ISOFIX?',
  'A legislação atual está identificada. Resta delimitar o alcance do item 3.5.3 para o conjunto banco/apoio e se a linha documental requer comprovação adicional ou compartilhada.',
  'CONTRAN 951/2022, Anexo I, item 3.5.3, alterada pela 997/2023. A 220/2007 está revogada.',
  'Você + especialista em ensaios',
  'Associar escopo do método e conteúdo do relatório à linha, sem confundir as ancoragens.',
  'Revisão documental. P-01 / ENS-3-05',source('contran-951-2022','contran-997-2023')],
 ['C04','Mangueiras de freio',
  'A linha “Mangueiras flexíveis do freio hidráulico” ainda exige relatório separado? Se sim, qual ato vigente e método? Se não, qual evidência do sistema de freios cobre o componente e como registrar isso no SISCAT?',
  'A ajuda usa 461/1972 e 636/1984. Não foi confirmada linha autônoma correspondente na tabela atual do Anexo XI. A ligação com o sistema de freios não prova, sozinha, exigência ou dispensa de relatório próprio.',
  'CONTRAN 915/2022 para o sistema. Portaria 990/2022, Anexo XI, item 1.3. Fundamento autônomo a confirmar.',
  'Você + especialista em CAT',
  'Documento vigente ou orientação oficial identificada que esclareça a entrega e sua cobertura.',
  'Revisão documental. P-02 / ENS-2-07',source('contran-915-2022',port990)],
 ['C05','Limpador e lavador: ano da 224',
  'Qual identificação documental devemos usar para a Resolução 224 sobre limpador e lavador? O SISCAT e o Anexo XI dizem 224/2007, mas há metadados oficiais com 2006. Qual publicação deve aparecer na ficha e no relatório?',
  'É uma divergência de identificação do ato, não falta de uma regra de limpador. Não vou escolher um ano sem registrar a publicação que resolve o conflito.',
  'Resolução CONTRAN 224; arts. 1º a 3º e anexos. Divergência oficial de ano preservada.',
  'Pesquisa do assistente; você pode indicar a publicação',
  'Publicação oficial e justificativa de identificação; manter referência cruzada aos rótulos divergentes.',
  'Metadados. P-03 / ENS-2-02',source('contran-224-2006',port990)],
 ['C06','Modelo atual da declaração nível 1',
  'Podemos conferir o modelo em branco atualmente disponibilizado pelo SISCAT para a declaração nível 1? Ele contém as mesmas linhas do Anexo XI republicado e exige alguma informação adicional? Basta o modelo, sem dados ou anexos privados.',
  'As 12 linhas foram complementadas pelo Anexo XI oficial porque o download do modelo na tela falhou. Falta comparar o arquivo atual do sistema com essa fonte.',
  'Portaria SENATRAN 990/2022 republicada, Anexo XI, itens 1.1 e 1.2.',
  'Você no SISCAT + conferência do assistente',
  'Comparar o modelo em branco e registrar diferenças. Não criar processo de teste nem enviar documentos.',
  'Guia operacional. DOS-07 / suplemento N1',source(port990)],
 ['C07','Propulsões da primeira versão',
  'A primeira versão vai atender só elétricos ou também combustão, híbridos e veículos com GNV? Confirme quais perfis entram agora e quais ficam para depois.',
  'Não há dúvida sobre a existência das regras. O exemplo capturado é elétrico; o escopo do produto determina quais ramos de combustível, alta tensão e GNV precisam ser validados antes do lançamento.',
  'Escopo já definido: automóvel novo, nacional, M1. Referências por perfil: 749/2018, 910/2022 e 280/2008.',
  'Você: decisão de escopo',
  'Lista explícita das propulsões incluídas; não usar o “não se aplica” do exemplo como regra geral.',
  'Escopo do aplicativo. P-07 / perfil',source('contran-749-2018','contran-910-2022','contran-280-2008')],
 ['C08','Faixa de massa e configuração',
  'Vamos limitar a primeira versão a M1 com PBT até 3.500 kg? Se não, quais faixas e configurações entram? Os campos de massa, lotação, fileiras, derivação e acessórios devem ser parâmetros do veículo.',
  'M1 e “leves até 3.500 kg” não são filtros intercambiáveis. A decisão de escopo precisa evitar aplicar tabelas de equipamentos e exceções à faixa errada.',
  'Escopo do produto. CONTRAN 993/2023, Anexo I, tabela 1; condições próprias dos demais atos.',
  'Você: decisão de escopo',
  'Definir faixa coberta e os dados obrigatórios do perfil para avaliar condições e exceções.',
  'Escopo do aplicativo. P-07 / perfil',source('contran-993-2023')],
 ['C09','Datas e enquadramento como novo projeto',
  'O aplicativo vai consultar apenas projetos e produção atuais ou também casos históricos? Para cada caso teremos data de fabricação, primeiro MMV/modelo-base e enquadramento como novo projeto conforme cada ato?',
  'Não falta uma resolução única de calendário. Cada obrigação tem gatilhos e exceções próprios; falta definir a abrangência temporal e os fatos que o usuário deverá informar.',
  'Exemplos de calendários: CONTRAN 949/2022, 752/2018, 759/2018 e 888/2021. Conferir cada dispositivo.',
  'Você define o período; assistente detalha as regras',
  'Abrangência temporal e campos definidos; cada regra mantém seu próprio prazo e definição.',
  'Escopo e aplicabilidade. P-05 / perfil',source('contran-949-2022','contran-752-2018','contran-759-2018','contran-888-2021')],
 ['C10','Acessórios e itens instalados',
  'Na primeira versão, quebra-mato, engate, bagageiro e suporte de bicicleta ficarão como ramos consultáveis, ativados quando o usuário indicar que o item existe? Quais outros acessórios entram no primeiro escopo?',
  'A condição “se instalado” já faz parte do modelo. Falta a decisão de cobertura inicial do produto, preservando requisitos fora das linhas de relatório do CAT.',
  'CONTRAN 215/2006 (quebra-mato), 937/2022 (engate) e 955/2022 (carga externa/suportes), conforme seus escopos.',
  'Você: decisão de escopo',
  'Registrar acessórios incluídos e deixar consulta aos requisitos condicionais acessível.',
  'Escopo do aplicativo. SEG-002 / 003 / 004',source('contran-215-2006','contran-937-2022','contran-955-2022')],
 ['C11','Quebra-mato: Inmetro e fornecedor',
  'Para o quebra-mato aplicável ao nosso perfil, quais registros e documentos do fornecedor precisam ser verificados? A cadeia que parte da Portaria Inmetro 400/2020 teve alteração posterior? O que vai ao CAT e o que fica como evidência de conformidade?',
  'Falta fechar a cadeia do regulamento de produto/fornecedor e separar registro, identificação do produto, instalação e entrega documental. A 215/2006 sozinha não encerra essa cadeia.',
  'CONTRAN 215/2006. Inmetro 400/2020 como ponto de partida; atos gerais e posteriores a conferir.',
  'Pesquisa do assistente; especialista valida a prática',
  'Atos vigentes e condições mapeados; documentos e responsável por cada comprovação identificados.',
  'Cadeia complementar. P-08 / SEG-002',source('contran-215-2006')+'\nhttps://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/portaria-inmetro-no-4002020?layout=norma_detalhe'],
 ['C12','Engate: Inmetro e fornecedor',
  'Para engate dentro do escopo da 937/2022, quais evidências do registro do fabricante e da conformidade do produto devemos exigir? Há alterações posteriores à Portaria Inmetro 309/2021 e o que muda para engate original de fábrica?',
  'O FAQ oficial aponta a 309/2021. Falta revisar a cadeia integral e as fronteiras de aplicação para não aplicar automaticamente a regra do acessório a todo engate de fábrica.',
  'CONTRAN 937/2022. Portaria Inmetro 309/2021 indicada no FAQ oficial; cadeia posterior ainda em revisão.',
  'Pesquisa do assistente; especialista valida a prática',
  'Distinguir equipamento original/acessório, escopo de massa e capacidade, registro e documentos aplicáveis.',
  'Cadeia complementar. P-08 / SEG-003',source('contran-937-2022')+'\n'+faqEngate],
 ['C13','Pneus: regulamento e comprovação',
  'Quais certificados, registros e marcações dos pneus devem ser conferidos para o veículo novo? A Portaria Inmetro 379/2021 e seus anexos tiveram alterações ou transições relevantes para as configurações do projeto?',
  'O FAQ oficial atualizado em 2026 aponta a 379/2021. Falta a revisão da cadeia e do escopo de cada configuração. Conformidade do pneu e adequação do conjunto pneu/roda ao veículo são verificações diferentes.',
  'CONTRAN 993/2023 e 913/2022, conforme o item. Inmetro 379/2021 indicada no FAQ oficial.',
  'Pesquisa do assistente; especialista valida as evidências',
  'Registrar versão do regulamento, transições e evidências de produto e de aplicação ao veículo.',
  'Cadeia complementar. P-08 / SEG-017',source('contran-993-2023','contran-913-2022')+'\n'+faqPneus],
 ['C14','Extintor: produto quando instalado',
  'Se o automóvel tiver extintor, quais evidências atuais de certificação e identificação do produto devem ser verificadas? Quais mudanças posteriores à Portaria Inmetro 108/2022 afetam essa checagem?',
  'A opcionalidade para automóvel e o local do suporte são tratados pela 919/2022. A dúvida restante é a cadeia atual de conformidade do produto quando ele for instalado.',
  'CONTRAN 919/2022. Portaria Inmetro 108/2022 indicada no FAQ oficial; conferir alterações posteriores.',
  'Pesquisa do assistente',
  'Regulamento do produto e alterações registrados sem transformar equipamento opcional em instalação obrigatória.',
  'Cadeia complementar. P-08 / SEG-024',source('contran-919-2022')+'\n'+faqExtintor],
 ['C15','GNV: cadeia de componentes, se incluído',
  'Se GNV entrar no escopo, quais regulamentos Inmetro de componentes, sistema e inspeção precisamos mapear? Quais evidências pertencem à fabricação/homologação e quais pertencem à conversão ou ao uso periódico?',
  'Falta identificar e conferir a cadeia completa dos atos de produto e serviço aplicáveis. Não há número único de portaria confirmado para toda a cadeia e não devemos misturar fabricação com conversão.',
  'CONTRAN 280/2008 como referência do ramo. Portarias Inmetro específicas ainda a identificar por objeto.',
  'Pesquisa do assistente, após a decisão C07',
  'Mapear cada objeto e etapa se incluído. Se adiado, justificar o limite de escopo em C07 e neste item.',
  'Cadeia condicional. P-08 / SEG-034',source('contran-280-2008')+'\n'+inmetroUrl],
 ['C16','ENSV e atos posteriores de rotulagem',
  'Após a Portaria 1.554/2022, quais atos de rotulagem e execução estão vigentes para M1? Quais itens devem ser declarados quando de série, opcionais ou não disponíveis? Algum ato posterior mudou participação, comprovação ou publicação?',
  'Falta fechar a cadeia posterior do programa e seu eventual novo regime. A presença de AEBS, ACC ou outro item na etiqueta não demonstra, sozinha, obrigação universal de instalação.',
  'Portaria SENATRAN 1.554/2022, especialmente arts. 5º, 9º, 10, 13 e 28. Atos posteriores a identificar/confrontar.',
  'Pesquisa do assistente; especialista valida a operação',
  'Atos posteriores e efeitos mapeados; separar instalação obrigatória, declaração e comprovação.',
  'Rotulagem. P-08 / DOS-08 / ensaios inovadores',source(port1554)+'\nhttps://www.gov.br/transportes/pt-br/assuntos/transito/senatran/portarias-2026'],
 ['C17','Publicações recentes e atualização do índice',
  'Houve ato de segurança, homologação ou rotulagem publicado depois de 06/10/2026 que altere nosso recorte? Qual publicação oficial deve entrar na cadeia antes de fixarmos a data de fechamento?',
  'O índice foi consultado em 31/10/2026, mas anuncia atualização em 06/10/2026. A conferência do catálogo não equivale a varredura completa das publicações posteriores do DOU.',
  'Índice CONTRAN e atos SENATRAN complementares. Ato posterior ainda não confirmado não será tratado como vigente por fonte secundária.',
  'Pesquisa do assistente',
  'Registrar janela, fontes e resultados da pesquisa de publicações posteriores e seus efeitos no recorte.',
  'Atualidade normativa. P-06',indexUrl+'\nhttps://www.in.gov.br/consulta'],
 ['C18','Métodos, edições e cobertura de relatórios',
  'Para os requisitos incluídos, quais métodos e edições serão usados e quais configurações cada evidência pode cobrir? Precisamos registrar alternativas, amostras, laboratório e critérios de aceitação sem assumir equivalência entre relatórios.',
  'O mapa identifica atos e dispositivos, mas não contém todos os métodos convertidos em critérios executáveis. Faltam detalhes técnicos e acesso legítimo aos textos incorporados quando necessário.',
  'Cada ato remete a seus anexos e métodos. Portaria 990/2022, Anexo XI. Edições não serão inventadas nem atualizadas automaticamente para a mais recente.',
  'Especialista em ensaios + pesquisa do assistente',
  'Condição para avaliar suficiência de relatórios: método, edição, amostra/configuração e escopo da evidência definidos.',
  'Validação técnica do aplicativo. P-05',source(port990)],
 ['C19','Campos condicionais de outros perfis',
  'Além do exemplo elétrico deferido, quais campos e anexos mudam para os demais perfis incluídos? Podemos conferir em exemplos autorizados ou documentação oficial, em leitura, sem alterar o processo existente?',
  'Não foram testadas validações por submissão nem variantes de propulsão, massa e modalidade. As dez guias foram observadas, mas isso não prova todos os campos condicionais do sistema.',
  'Regras procedimentais da Portaria 990/2022 e comportamento observado no SISCAT. Validações do sistema não criam obrigação técnica por si sós.',
  'Você na navegação + conferência do assistente',
  'Documentar diferenças dos perfis incluídos ou restringir expressamente o guia operacional ao perfil validado.',
  'Guia operacional. P-07 / DOS-03 a DOS-09',source(port990)],
];

const wb=Workbook.create();
const main=wb.worksheets.add('Confirmar hoje');
const flowSheet=wb.worksheets.add('Fluxo');
const tree=wb.worksheets.add('Árvore');
const font='Arial';
const dark='#20334D', ink='#1D2939', muted='#526174', amber='#FFF3CF', light='#F2F5F9';
const first=10,last=first+questions.length-1;
const headers=['ID','Tema','O que você deve falar','Minha dúvida sobre qual legislação','Base já identificada','Quem confirma ou pesquisa','Sua resposta / artigo confirmado','Link ou evidência recebida','Situação','Registro da confirmação','Critério para encerrar o item','Etapa afetada / origem'];

main.showGridLines=false;
main.tabColor=dark;
main.getRange(`A1:N${last}`).format.font={name:font,size:10,color:ink};
main.getRange('A2').values=[['Confirmações para fechar a revisão de segurança']];
main.getRange('A2').format.font={name:font,size:16,bold:true,color:dark};
main.getRange('A3').values=[['31/10/2026. Automóvel novo de passageiros fabricado no Brasil, M1. O exemplo capturado é elétrico.']];
main.getRange('A3').format.font={name:font,size:10,italic:true,color:muted};
main.getRange('A4:L4').format.borders={bottom:{style:'thin',color:dark}};
main.getRange('A5').values=[['Listados']];
main.getRange('B5').formulas=[[`=COUNTA(A${first}:A${last})`]];
main.getRange('C5').values=[['Em aberto ou sem evidência suficiente para registrar o encerramento']];
main.getRange('D5').formulas=[[`=B5-COUNTIFS(J${first}:J${last},"Encerramento registrado")-COUNTIFS(J${first}:J${last},"Escopo excluído com justificativa")`]];
main.getRange('B5').format.font={name:font,size:14,bold:true,color:dark};
main.getRange('D5').format.font={name:font,size:14,bold:true,color:dark};
main.getRange('A6').values=[['Preencha G:I (amarelo). Para validar ou excluir um item, registre a resposta e uma evidência ou justificativa identificável.']];
main.getRange('A7').values=[['Os itens incluem dúvidas, decisões de escopo e pesquisa do assistente. Preencher a lista não conclui automaticamente a validação normativa.']];
main.getRange('A6:A7').format.font={name:font,size:10,color:muted};
main.getRange('A9:L9').values=[headers];
main.getRange('N9').values=[['Fontes oficiais de partida; consulta em 31/10/2026']];
const values=questions.map((q,i)=>[q[0],q[1],q[2],q[3],q[4],q[5],null,null,'Pendente',null,q[6],q[7]]);
main.getRange(`A${first}:L${last}`).values=values;
main.getRange(`N${first}:N${last}`).values=questions.map(q=>[q[8]]);
main.getRange(`J${first}:J${last}`).formulas=questions.map((q,i)=>{
 const r=first+i;
 return [`=IF(OR(I${r}="Validado",I${r}="Fora do escopo"),IF(AND(LEN(TRIM(G${r}))>0,LEN(TRIM(H${r}))>0),IF(I${r}="Fora do escopo","Escopo excluído com justificativa","Encerramento registrado"),"Falta resposta ou evidência"),"Em aberto")`];
});
const table=main.tables.add(`A9:L${last}`,true,'ConfirmacoesSeguranca');
table.showFilterButton=true;
main.getRange(`A9:L${last}`).format.wrapText=true;
main.getRange(`A9:L${last}`).format.verticalAlignment='top';
main.getRange(`A${first}:L${last}`).format.font={name:font,size:10,color:ink};
main.getRange(`N${first}:N${last}`).format={wrapText:true,verticalAlignment:'top',font:{name:font,size:10,color:muted}};
main.getRange('A9:L9').format={fill:dark,font:{name:font,size:10,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:36};
main.getRange('N9').format={fill:light,font:{name:font,size:10,bold:true,color:dark},wrapText:true,verticalAlignment:'center'};
const widths=[9,25,65,65,39,25,50,45,22,30,48,32,3,66];
widths.forEach((w,i)=>main.getRangeByIndexes(0,i,last,1).format.columnWidth=w);
for(let i=0;i<questions.length;i++){
 const r=first+i;
 main.getRange(`A${r}:L${r}`).format.fill=i%2===0?'#FFFFFF':light;
 main.getRange(`G${r}:I${r}`).format.fill=amber;
 const candidates=[questions[i][2],questions[i][3],questions[i][4],questions[i][5],questions[i][6],questions[i][7],questions[i][8]];
 const candidateWidths=[65,65,39,25,48,32,66];
 const maxLines=Math.max(...candidates.map((text,j)=>text.split('\n').reduce((s,line)=>s+Math.max(1,Math.ceil(line.length/candidateWidths[j])),0)));
 main.getRange(`A${r}:N${r}`).format.rowHeight=Math.max(90,maxLines*13+12);
}
main.getRange(`I${first}:I${last}`).dataValidation={rule:{type:'list',values:['Pendente','Resposta recebida','Validado','Fora do escopo']}};
main.getRange(`J${first}:J${last}`).conditionalFormats.add('containsText',{text:'Falta resposta',format:{fill:'#FDE8E8',font:{color:'#9B1C1C',bold:true}}});
main.getRange(`J${first}:J${last}`).conditionalFormats.add('containsText',{text:'Encerramento registrado',format:{fill:'#E5F2E9',font:{color:'#245B38'}}});
main.freezePanes.freezeRows(9);
main.freezePanes.freezeColumns(2);

// Preserve the actual captured relationships. The parent column is a navigation
// view only; many-to-many requirement/evidence/component links remain explicit.
flowSheet.showGridLines=false;
flowSheet.getRange('A1:F14').format.font={name:font,size:10,color:ink};
flowSheet.getRange('A2').values=[['Fluxo de consulta e homologação']];
flowSheet.getRange('A2').format.font={name:font,size:16,bold:true,color:dark};
flowSheet.getRange('A3').values=[['Navegação para leigos proposta a partir da captura SISCAT. O aplicativo ainda não está implementado.']];
flowSheet.getRange('A3').format.font={name:font,size:10,italic:true,color:muted};
flowSheet.getRange('A4:F4').format.borders={bottom:{style:'thin',color:dark}};
flowSheet.getRange('A5').values=[['Dez guias do exemplo observadas em leitura; análise e submissão não foram exercitadas.']];
flowSheet.getRange('A6').values=[['Ordem']];flowSheet.getRange('D6:F6').values=[['Etapa','Resultado esperado','Estado']];
const flowOutputs=[
 'Perfil com tipo, categoria, massas, propulsão, datas e equipamentos.',
 'Lista de requisitos: aplica, não aplica com fundamento, falta informação ou revisão pendente.',
 'Explicação em linguagem simples, dispositivo e regiões do veículo relacionadas.',
 'Plano de comprovação com método, edição e configuração definidos.',
 'Evidências identificadas e cobertura revisada por configuração.',
 'Documentos associados às dez guias captadas, sem duplicações presumidas.',
 'Fluxo de análise e tratamento de exigências; não foi exercitado nesta captura em leitura.',
 'Requisitos de comercialização e uso separados das entregas do CAT.',
];
inventory.modelo_de_relacoes.fluxo_para_leigos.forEach((label,i)=>{
 const r=7+i;
 flowSheet.getRange(`A${r}`).values=[[i+1]];
 flowSheet.getRange(`D${r}:F${r}`).values=[[label,flowOutputs[i],'Projeto funcional']];
 flowSheet.getRange(`A${r}:F${r}`).format.fill=i%2===0?'#FFFFFF':light;
 flowSheet.getRange(`A${r}:F${r}`).format.rowHeight=46;
});
flowSheet.getRange('A6:F6').format={fill:dark,font:{name:font,size:10,bold:true,color:'#FFFFFF'},rowHeight:28};
flowSheet.getRange('D7:F14').format.wrapText=true;
flowSheet.getRange('D7:F14').format.verticalAlignment='center';
[9,2,2,58,100,28].forEach((width,i)=>flowSheet.getRangeByIndexes(0,i,14,1).format.columnWidth=width);
tree.showGridLines=false;
tree.getRange('A1:I150').format.font={name:font,size:10,color:ink};
tree.getRange('A2').values=[['Árvore de segurança e conexões']];
tree.getRange('A2').format.font={name:font,size:16,bold:true,color:dark};
tree.getRange('A3').values=[['Hierarquia funcional organizada. A árvore navegável no aplicativo ainda será implementada.']];
tree.getRange('A4').values=[['“Pai” organiza a navegação. Um requisito pode atingir várias peças e compartilhar evidências. A condição legal prevalece sobre o ramo.']];
tree.getRange('A5').values=[['Os 41 componentes têm IDs semânticos. Associação às malhas, hierarquia de peças e explosão do 3D ainda precisam ser verificadas.']];
tree.getRange('A3:A5').format.font={name:font,size:10,color:muted};
const treeHeaders=['ID','Pai na navegação','Vista','Etapa / requisito','Condição ou conteúdo','Comprovação / conexão','Componentes 3D','Estado atual','Base legal / origem'];
const nodes=[
 ['SEGURANCA','','Consulta','Segurança do automóvel M1','Novo, fabricado no Brasil; demais parâmetros por configuração.','Três vistas conectadas: veículo, dossiê e 3D.','','Revisão normativa com pendências','Inventário de segurança, versão 0.1-pesquisa'],
 ['PERFIL','SEGURANCA','Enquadramento','Caracterizar o veículo',inventory.modelo_de_relacoes.entidades.perfil_veiculo.join('; '),'Alimenta a decisão de aplicação de cada requisito.','veiculo','Modelo funcional proposto','Condições específicas dos atos'],
 ['CONSTRUCAO','SEGURANCA','Veículo','Requisitos do veículo','Inclui exigências sem relatório próprio no fluxo.','Consultar requisito, condição, documento e peça.','','Ramos organizados; aplicabilidade parametrizada','Requisitos complementares do inventário'],
 ['DOSSIE','SEGURANCA','Dossiê','Dossiê de homologação','Guias observadas no exemplo elétrico M1.','As guias não são uma lista exaustiva das obrigações do veículo.','','Captura das dez guias concluída no exemplo','SISCAT observado + Portaria 990/2022'],
 ['MODELO-3D','SEGURANCA','3D','Consulta visual aos componentes','Consulta textual disponível durante o carregamento.','Selecionar peça mostra requisitos; selecionar requisito destaca regiões.','','IDs semânticos; malhas ainda não associadas','Modelo de relações do inventário'],
];
inventory.guias.forEach((g,i)=>{
 const content=g.grupos.map(group=>`${group.grupo}: ${group.campos.join(', ')}`).join('\n');
 const documents=g.anexos_ou_comprovacoes.join('\n') || (i===9?'Comparação em leitura; não cria obrigação documental.':'Consultar notas e detalhes da captura.');
 nodes.push([g.id,'DOSSIE','SISCAT',`${i+1}. ${g.titulo}`,content,documents,'','Guia observada em leitura','SISCAT observado; regras de outros perfis não testadas']);
});
inventory.suplemento_nivel1_fonte_oficial.forEach((n,i)=>nodes.push([
 `N1-${String(i+1).padStart(2,'0')}`,'DOS-07','Declaração N1',n.rotulo_anexo_xi,n.condicao,
 `Vínculo: ${n.vinculo_requisito}. Declaração de conformidade quando aplicável.`,
 '','Suplemento por fonte oficial; modelo da tela não recuperado',n.fontes_para_revisao_atual.join('; ')
]));
inventory.matriz_ensaios.forEach(n=>nodes.push([
 n.id,'DOS-07',`Ensaio nível ${n.nivel_observado}`,n.rotulo_siscat,n.aplicabilidade.condicao,
 `${n.entrega.tipo}. ${n.revisao.conclusao}`,n.partes_3d.join('; '),n.revisao.estado,
 `${n.fontes.join('; ')}. ${n.dispositivo}`
]));
inventory.requisitos_complementares.forEach(n=>nodes.push([
 n.id,'CONSTRUCAO','Requisito complementar',n.titulo,n.aplicabilidade.condicao,
 n.comprovacao_ou_acao,n.partes_3d.join('; '),n.revisao,`${n.fontes.join('; ')}. ${n.dispositivo}`
]));
Object.entries(inventory.partes_3d_semanticas).forEach(([id,label])=>{
 const connected=[...inventory.matriz_ensaios,...inventory.requisitos_complementares].filter(n=>n.partes_3d.includes(id)).map(n=>n.id);
 nodes.push([`3D-${id}`,'MODELO-3D','Componente semântico',label,'Associação ilustrativa. Não prova medidas, desempenho nem conformidade.',connected.join('; '),id,'Implementação das malhas pendente','Relações semânticas do inventário']);
});
const treeStart=7,treeEnd=treeStart+nodes.length;
tree.getRange(`A${treeStart}:I${treeStart}`).values=[treeHeaders];
tree.getRange(`A${treeStart+1}:I${treeEnd}`).values=nodes;
const treeTable=tree.tables.add(`A${treeStart}:I${treeEnd}`,true,'ArvoreSeguranca');
treeTable.showFilterButton=true;
tree.getRange(`A${treeStart}:I${treeEnd}`).format={wrapText:true,verticalAlignment:'top',font:{name:font,size:10,color:ink}};
tree.getRange(`A${treeStart}:I${treeStart}`).format={fill:dark,font:{name:font,size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:32};
const treeWidths=[25,20,25,48,76,76,40,45,76];
treeWidths.forEach((width,i)=>tree.getRangeByIndexes(0,i,treeEnd,1).format.columnWidth=width);
nodes.forEach((node,i)=>{
 const r=treeStart+1+i;
 const maxLines=Math.max(...node.map((v,j)=>String(v).split('\n').reduce((s,line)=>s+Math.max(1,Math.ceil(line.length/treeWidths[j])),0)));
 tree.getRange(`A${r}:I${r}`).format.rowHeight=Math.max(50,maxLines*13+12);
 tree.getRange(`A${r}:I${r}`).format.fill=i%2===0?'#FFFFFF':light;
});
tree.freezePanes.freezeRows(treeStart);
tree.freezePanes.freezeColumns(2);

// Functional verification: a selected status alone must not close a record.
wb.recalculate();
const baseline=main.getRange('D5').values[0][0];
if(baseline!==questions.length)throw new Error(`Unexpected open count: ${baseline}`);
main.getRange('I10').values=[['Validado']];
wb.recalculate();
if(main.getRange('D5').values[0][0]!==questions.length)throw new Error('Status alone closed an item');
if(main.getRange('J10').values[0][0]!=='Falta resposta ou evidência')throw new Error('Missing evidence not surfaced');
main.getRange('G10:H10').values=[['Resposta temporária de teste','Publicação identificada para teste']];
wb.recalculate();
if(main.getRange('D5').values[0][0]!==questions.length-1)throw new Error('Completed inputs failed to update count');
main.getRange('G10:H10').clear({applyTo:'contents'});
main.getRange('I10').values=[['Pendente']];
wb.recalculate();

// Exact data completeness checks against the saved capture.
if(questions.length!==19)throw new Error('Confirmation list incomplete');
if(nodes.filter(n=>n[2]==='SISCAT').length!==10)throw new Error('Missing tab');
if(nodes.filter(n=>n[2].startsWith('Ensaio nível')).length!==36)throw new Error('Missing test line');
if(nodes.filter(n=>n[2]==='Requisito complementar').length!==35)throw new Error('Missing complementary requirement');
if(nodes.filter(n=>n[2]==='Componente semântico').length!==41)throw new Error('Missing semantic component');
const nodeIds=new Set(nodes.map(n=>n[0]));
if(nodeIds.size!==nodes.length)throw new Error('Duplicate tree ID');
if(nodes.some(n=>n[1]&&!nodeIds.has(n[1])))throw new Error('Missing parent');
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:50},summary:'final formula error scan',maxChars:3000});
await fs.writeFile(path.join(workDir,'formula-check.ndjson'),errors.ndjson);
const inspection=await wb.inspect({kind:'table',range:'Confirmar hoje!G9:J12',include:'values,formulas',tableMaxRows:4,tableMaxCols:4,maxChars:4000});
await fs.writeFile(path.join(workDir,'inspection.ndjson'),inspection.ndjson);

for(const [sheetName,range,name] of [
 ['Confirmar hoje','A2:D13','perguntas'],
 ['Confirmar hoje','F9:J13','respostas'],
 ['Fluxo','A2:F14','fluxo'],
 ['Árvore','A2:F13','arvore'],
]){
 const rendered=await wb.render({sheetName,range,scale:1.3,format:'png'});
 await fs.writeFile(path.join(workDir,`${name}.png`),new Uint8Array(await rendered.arrayBuffer()));
}
const outputPath=path.join(outputDir,'Confirmacoes-seguranca.xlsx');
await (await SpreadsheetFile.exportXlsx(wb)).save(outputPath);
await fs.writeFile(path.join(workDir,'validacao.json'),JSON.stringify({
 data:'2026-10-31',perguntas:questions.length,pendentes:main.getRange('D5').values[0][0],
 guias:10,ensaios:36,complementares:35,componentes_semanticos:41,nos:nodes.length,
 status_sozinho_nao_encerra:true,resposta_e_evidencia_atualizam_contagem:true,entradas_de_teste_restauradas:true,
 arquivo:outputPath,
},null,2));
console.log(JSON.stringify({outputPath,perguntas:questions.length,nos:nodes.length,pendentes:main.getRange('D5').values[0][0]}));
