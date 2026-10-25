'use strict';

const { revision: REGULATORY_REVISION } = require('../../data/process/regulatory-revision.json');

function needsRegulatoryReview(check, revision = REGULATORY_REVISION) {
  return !!check && ['done', 'na'].includes(check.status) && check.regulatoryRevision !== revision;
}

function recordCheckReview(previous, next, confirmed = false, revision = REGULATORY_REVISION) {
  const result = { ...next };
  if (confirmed) {
    result.regulatoryRevision = revision;
    result.regulatoryReviewedAt = new Date().toISOString();
  } else {
    // Editing notes/evidence never silently revalidates an older conclusion.
    if (previous?.regulatoryRevision) result.regulatoryRevision = previous.regulatoryRevision;
    else delete result.regulatoryRevision;
    if (previous?.regulatoryReviewedAt) result.regulatoryReviewedAt = previous.regulatoryReviewedAt;
    else delete result.regulatoryReviewedAt;
  }
  return result;
}

if (typeof module !== 'undefined')
  module.exports = { REGULATORY_REVISION, needsRegulatoryReview, recordCheckReview };
