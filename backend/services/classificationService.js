const hf = require('./hfService');

const CANDIDATE_LABELS = ['Frontend', 'Backend', 'AI/ML', 'DevOps', 'Data Engineering', 'Other'];

async function classifyJobCategory(title, description) {
  try {
    const input = title ? `${title}. ${description}` : description;
        const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      provider: 'hf-inference',
      inputs: input,
      parameters: { candidate_labels: CANDIDATE_LABELS },
    });
    return result[0]?.label ?? result[0]?.labels?.[0] ?? 'Other';
  } catch (err) {
    console.error('[classifyJobCategory] HF call failed:', err.message);
    return 'Other';
  }
}

module.exports = { classifyJobCategory };
