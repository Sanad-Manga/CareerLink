const { InferenceClient } = require("@huggingface/inference");
const hf = new InferenceClient(process.env.HF_TOKEN);
module.exports = hf;
