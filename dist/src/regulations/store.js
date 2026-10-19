'use strict';
const regulatoryData = { contran: null, proconve: null, inmetro: null, anatel: null },
  regulatoryLoads = {};
const regulatoryConfig = {
  contran: {
    label: 'CONTRAN',
    title: 'Resoluções CONTRAN',
    issuer: 'SENATRAN / CONTRAN',
    url: 'data/contran/active.json',
    csv: 'data/contran/active.csv',
  },
  proconve: {
    label: 'PROCONVE',
    title: 'PROCONVE · legislação vigente',
    issuer: 'CONAMA / IBAMA',
    url: 'data/proconve/active.json',
    csv: 'data/proconve/active.csv',
  },
  inmetro: {
    label: 'Inmetro',
    title: 'Inmetro · componentes e certificação',
    issuer: 'INMETRO',
    url: 'data/inmetro/active.json',
    csv: 'data/inmetro/active.csv',
  },
  anatel: {
    label: 'Anatel',
    title: 'Anatel · rádio e conectividade',
    issuer: 'ANATEL',
    url: 'data/anatel/active.json',
    csv: 'data/anatel/active.csv',
  },
};
const contranPageSize = 25;
let regulatoryBaseCatalog = null;
const SYSTEM_CONTRAN_LABELS = {
  vidros: 'Vidros',
  'pneus-rodas': 'Pneus e rodas',
  freios: 'Freios',
  iluminacao: 'Iluminação',
  ocupantes: 'Ocupantes',
  carroceria: 'Carroceria',
  retrovisores: 'Retrovisores',
  propulsao: 'Propulsão',
  eletronica: 'Eletrônica',
  identificacao: 'Identificação',
  chassi: 'Chassi',
};

let siteIndexPromise = null;
const regulatoryRecordLoads = new Map();
const regulatoryHistoricalReferences = [];
const regulatoryHistoricalLoads = new Map();
function initializeRegulatoryStore() {
  if (!siteIndexPromise) {
    siteIndexPromise = fetch('data/site/index.json')
      .then((response) => {
        if (!response.ok) throw new Error('Índice indisponível');
        return response.json();
      })
      .then((index) => {
        if (index.schemaVersion !== 2 || !index.base || !index.regulations)
          throw new Error('Índice inválido');
        for (const source of Object.keys(regulatoryConfig)) {
          const data = index.regulations[source];
          if (
            !data?.metadata ||
            !Array.isArray(data.records) ||
            data.records.some((r) => r.publication?.included !== true)
          )
            throw new Error('Publicação inválida');
          for (const record of data.records) {
            record.reviewStatus = {
              reviewedAt: data.metadata.asOf,
              ...record.reviewStatus,
            };
          }
          regulatoryData[source] = data;
        }
        regulatoryHistoricalReferences.splice(
          0,
          regulatoryHistoricalReferences.length,
          ...(index.historicalReferences || []),
        );
        return index;
      })
      .catch((error) => {
        siteIndexPromise = null;
        throw error;
      });
  }
  return siteIndexPromise;
}
async function loadRegulations(source) {
  if (!regulatoryConfig[source]) throw new Error('Fonte desconhecida');
  if (!regulatoryData[source]) await initializeRegulatoryStore();
  return regulatoryData[source];
}
function loadContran() {
  return loadRegulations('contran');
}
async function loadRegulationRecord(source, id) {
  const data = await loadRegulations(source);
  const position = data.records.findIndex((r) => r.id === id);
  if (position < 0) throw new Error('Registro fora da consulta publicada');
  if (!data.records[position]._summary) return data.records[position];
  const key = source + ':' + id;
  if (!regulatoryRecordLoads.has(key)) {
    regulatoryRecordLoads.set(
      key,
      fetch('data/site/records/' + source + '/' + encodeURIComponent(id) + '.json')
        .then((response) => {
          if (!response.ok) throw new Error('Detalhes indisponíveis');
          return response.json();
        })
        .then((record) => {
          if (record.id !== id || record.publication?.included !== true)
            throw new Error('Registro inválido');
          data.records[position] = { ...record, _summary: false };
          if (regulatoryBaseCatalog) {
            catalog = installActiveRegulations(regulatoryBaseCatalog);
            delete treeModels.tree;
            delete treeModels.mover;
          }
          return data.records[position];
        })
        .catch((error) => {
          regulatoryRecordLoads.delete(key);
          throw error;
        }),
    );
  }
  return regulatoryRecordLoads.get(key);
}

async function loadHistoricalRecord(source, id) {
  await initializeRegulatoryStore();
  if (!regulatoryHistoricalReferences.some((r) => r.agency === source && r.id === id))
    throw new Error('Registro histórico não publicado');
  if ((!Object.hasOwn(regulatoryConfig, source) && source !== 'mover') || !/^[a-z0-9-]+$/.test(id))
    throw new Error('Fonte histórica inválida');
  const key = source + ':' + id;
  if (!regulatoryHistoricalLoads.has(key)) {
    regulatoryHistoricalLoads.set(
      key,
      fetch('data/site/history/' + source + '/' + id + '.json')
        .then((response) => {
          if (!response.ok) throw new Error('Histórico indisponível');
          return response.json();
        })
        .then((record) => {
          if (record.id !== id || record.publication?.included !== false)
            throw new Error('Registro histórico inválido');
          return record;
        })
        .catch((error) => {
          regulatoryHistoricalLoads.delete(key);
          throw error;
        }),
    );
  }
  return regulatoryHistoricalLoads.get(key);
}
