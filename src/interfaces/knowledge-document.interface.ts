export interface IKnowledgeDocument {
  id: number;
  title: string;
  source_type: string;
  original_question: string | null;
  original_answer: string | null;
  category?: string | null;
  normalized_question: string | null;
  status: 'draft' | 'ready' | 'archived';
  uploaded_by: string | null;
  batch_id: string | null;
  created_at?: string;
  updated_at?: string;
}
