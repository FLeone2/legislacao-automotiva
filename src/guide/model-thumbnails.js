'use strict';

const index = require('../../assets/models/suv/thumbnails/index.json');
const keyFor = (ids) => [...new Set(ids)].sort().join('--');
const detailNotes = {
  'vidros/limpadores':
    'Conjunto de vidros relacionado. Limpadores e lavadores não são reproduzidos como peças individuais nesta miniatura.',
  'vidros/janelas':
    'Exemplar de porta relacionado. O mecanismo de acionamento das janelas não é reproduzido individualmente.',
  'freios/estabilidade':
    'Exemplar do freio dianteiro, com cubo e parafusos da roda como contexto. O controle eletrônico de estabilidade não possui uma peça individual nesta imagem.',
  'freios/frenagem':
    'Exemplar do freio dianteiro, com cubo e parafusos da roda como contexto; não representa isoladamente todo o sistema ABS.',
  'ocupantes/cintos':
    'Bancos do modelo de referência. Cintos e ancoragens não são todos reproduzidos como peças separadas.',
  'ocupantes/materiais':
    'Conjunto de bancos do modelo. A imagem não especifica composição de material nem resultado de ensaio.',
  'eletronica/obd':
    'Motor e módulos didáticos relacionados; não representam uma porta ou arquitetura OBD certificada.',
  'identificacao/vin':
    'Elementos de identificação do modelo. A gravação VIN não é reproduzida nesta miniatura.',
  'identificacao/rotulagem':
    'Elementos de identificação do modelo. Etiquetas e marcações regulatórias não são individualizadas.',
};

function modelThumbnail(part = {}, modelKind = 'car') {
  if (modelKind !== index.sceneKind) return null;
  const selection = part.subsystemId
    ? index.subsystems[part.subsystemId]
    : index.assemblies[part.assemblyId || part.id];
  if (!selection) return null;
  const ids = part.assemblyIds || selection.assemblyIds;
  if (keyFor(ids) !== keyFor(selection.assemblyIds)) return null;
  const image = index.images[selection.imageId];
  if (!image || keyFor(image.assemblyIds) !== keyFor(ids)) return null;
  const example = image.mechanicalExample || Boolean(part.exampleOnly);
  return {
    ...image,
    assetUrl: image.asset + '?v=' + image.sha256.slice(0, 16),
    caption: example
      ? 'Exemplo ilustrativo do conjunto 3D'
      : image.subset
        ? 'Exemplo do conjunto 3D'
        : 'Conjunto 3D relacionado',
    note:
      detailNotes[part.subsystemId] ||
      image.notes.join(' ') ||
      'Referência visual do modelo 3D; não define a configuração ou aplicabilidade do projeto.',
    depictedLabel: image.labels.join(' · '),
    hasBMWSource: image.modelSources.includes('bmw-x5-g05'),
    authoredExample: image.modelSources.includes('authored-mechanics'),
    sourceUrl: 'https://github.com/bmwcarit/digital-car-3d',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  };
}

if (typeof module !== 'undefined') module.exports = { modelThumbnail };
