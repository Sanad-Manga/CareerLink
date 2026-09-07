// Shared vector-similarity helpers for AI features (job recommendations,
// applicant ranking, and any future embedding-based matching).

// Cosine similarity between two equal-length numeric vectors.
const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
};

module.exports = { cosineSimilarity };