export function normalizeKnowledgeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildKnowledgeChunkText(question: string, answer: string): string {
  return `Question: ${question}\nAnswer: ${answer}`;
}
