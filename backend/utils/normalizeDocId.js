function normalizeDocId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
}

module.exports = normalizeDocId;
