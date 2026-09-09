const hf = require('./hfService');

// Embeds a user's skills + bio into a vector, mirroring getJobEmbedding in
// jobController.js. Returns null (never throws) on empty input or HF failure,
// so callers can fall back to `scored: false` instead of erroring out.
const getUserEmbedding = async (skills = [], bio = '') => {
  try {
    const text = [skills.join(' '), bio].filter(Boolean).join(' ').trim();
    if (!text) return null;

    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      provider: 'hf-inference',
      inputs: text,
    });

    if (!Array.isArray(result) || typeof result[0] !== 'number') {
      console.error('[getUserEmbedding] Unexpected embedding shape:', JSON.stringify(result).slice(0, 100));
      return null;
    }
    return result;
  } catch (err) {
    console.error('[getUserEmbedding] HF call failed:', err.message);
    return null;
  }
};

module.exports = { getUserEmbedding };