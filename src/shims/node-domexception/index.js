// Custom zero-dependency shim to replace deprecated node-domexception
// using native globalThis.DOMException in modern Node.js environments.
module.exports = globalThis.DOMException || Error;
