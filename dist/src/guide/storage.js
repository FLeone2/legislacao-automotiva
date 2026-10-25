'use strict';
const KEY = 'homologation-projects-v1';
const STATUSES = ['pending', 'in_progress', 'done', 'na'];
function validateProfile(profile) {
  const fields = [
    'name',
    'category',
    'powertrain',
    'fuel',
    'origin',
    'purpose',
    'massKg',
    'seats',
    'year',
    'radio',
    'componentMarket',
    'usage',
    'massRunningKg',
    'payloadKg',
    'derivedFromPassenger',
    'offroad',
  ];
  if (
    !profile ||
    typeof profile !== 'object' ||
    Array.isArray(profile) ||
    fields.some((key) => !Object.prototype.hasOwnProperty.call(profile, key)) ||
    typeof profile.name !== 'string' ||
    !profile.name.trim() ||
    profile.name.length > 200
  )
    throw new Error(
      'Perfil incompleto ou inválido. Use uma exportação JSON deste guia; dados técnicos não são preenchidos por suposição.',
    );
  for (const key of [
    'category',
    'powertrain',
    'fuel',
    'origin',
    'purpose',
    'componentMarket',
    'usage',
  ])
    if (typeof profile[key] !== 'string') throw new Error('Campo de perfil inválido.');
  for (const key of ['massKg', 'seats', 'year', 'massRunningKg', 'payloadKg'])
    if (
      profile[key] !== null &&
      (typeof profile[key] !== 'number' || !Number.isFinite(profile[key]) || profile[key] < 0)
    )
      throw new Error('Valor técnico inválido no perfil.');
  for (const key of ['radio', 'derivedFromPassenger', 'offroad'])
    if (profile[key] !== null && typeof profile[key] !== 'boolean')
      throw new Error('Condição técnica inválida no perfil.');
}
function validateProject(value) {
  if (
    !value ||
    value.schemaVersion !== 1 ||
    typeof value.id !== 'string' ||
    !value.id ||
    value.id.length > 100 ||
    !value.checks ||
    typeof value.checks !== 'object' ||
    Array.isArray(value.checks)
  )
    throw new Error('Arquivo de processo inválido. Use uma exportação JSON deste guia.');
  validateProfile(value.profile);
  if (value.profileHistory !== undefined) {
    if (!Array.isArray(value.profileHistory) || value.profileHistory.length > 20)
      throw new Error('Histórico de perfil inválido.');
    for (const entry of value.profileHistory) validateProfile(entry?.profile);
  }
  if (Object.keys(value.checks).length > 200) throw new Error('Limite de itens excedido.');
  for (const entry of Object.values(value.checks)) {
    if (
      !entry ||
      !STATUSES.includes(entry.status) ||
      (entry.note !== undefined && (typeof entry.note !== 'string' || entry.note.length > 10000))
    )
      throw new Error('Status ou nota de checklist inválido.');
    if (
      entry.evidence !== undefined &&
      (typeof entry.evidence !== 'string' || entry.evidence.length > 1000)
    )
      throw new Error('Referência de evidência inválida.');
    if (entry.status === 'na' && !String(entry.note || '').trim())
      throw new Error('Itens não aplicáveis precisam de justificativa.');
  }
  return value;
}
function loadProjects(storage) {
  let raw = null;
  try {
    raw = storage.getItem(KEY);
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value) || value.length > 50) throw new Error('Invalid collection');
    return { projects: value.map(validateProject), error: null, raw: null };
  } catch {
    return {
      projects: [],
      raw,
      error:
        'Não foi possível ler os processos deste navegador. Exporte os dados para recuperação antes de limpar o armazenamento.',
    };
  }
}
function saveProjects(storage, projects) {
  try {
    const existing = loadProjects(storage);
    if (existing.error && existing.raw) {
      // Preserve unreadable original data before any replacement. A failed backup aborts saving.
      const recoveryKey = KEY + '-recovery';
      if (!storage.getItem(recoveryKey)) storage.setItem(recoveryKey, existing.raw);
      else if (storage.getItem(recoveryKey) !== existing.raw)
        return 'Há dados de recuperação anteriores. Exporte os dados atuais antes de substituir o armazenamento.';
    }
    if (projects.length > 50) throw new Error('Project limit');
    projects.forEach(validateProject);
    storage.setItem(KEY, JSON.stringify(projects));
    return null;
  } catch {
    return 'O navegador não permitiu salvar. Exporte o JSON para conservar seu processo.';
  }
}
if (typeof module !== 'undefined')
  module.exports = { validateProject, loadProjects, saveProjects, STATUSES };
