export interface RaiKnowledgeItem {
  id: string;
  category: string;
  subCategory: string;
  question: string;
  answerConcept: string;
  keywords: string[];
  entities?: string[];
  relatedIntents?: string[];
  requiresLiveData: boolean;
  requiresML: boolean;
  requiresFarmerContext: boolean;
}

export interface KnowledgeSearchResult {
  item: RaiKnowledgeItem;
  score: number;
  matchedKeywords: string[];
}
