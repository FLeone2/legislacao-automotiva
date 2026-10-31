'use strict';

// Static JSON requires work in Node's tests and in the older esbuild bundled
// with Cloudflare Pages' Wrangler 3. The bundler embeds both trusted snapshots;
// this module performs no runtime filesystem reads in the Worker.
module.exports = {
  catalog: require('../../data/prototype/catalog.json'),
  passageIndex: require('../../data/ai/passages.json'),
  workflow: require('../../data/prototype/workflow.json'),
  documentIndex: require('../../data/prototype/document-chunks.json'),
};
