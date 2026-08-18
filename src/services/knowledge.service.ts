/**
 * R.A.I. Knowledge Intelligence Retrieval Service
 * Provides fast, sub-millisecond, indexed semantic retrieval across 35,857 structured domain knowledge items.
 *
 * Implements:
 * 1. Inverted-Index TF-IDF Ranking with Exact Match & Entity Boosting
 * 2. Multilingual Agronomic Synonym Expansion (Hindi / Hinglish / English)
 * 3. Farmer Persona Category Boosting (1.75x for AGRICULTURE, PRACTICAL_ACTIONS, RAINFALL_FORECAST)
 * 4. Strict Scientific Separation between Static Agronomy and Live Weather Telemetry
 */

import { RaiKnowledgeItem, KnowledgeSearchResult } from '../types/knowledge';
import { getAllRaiKnowledgeItems, RAI_KNOWLEDGE_PARTITIONS, RAI_TOTAL_KNOWLEDGE_COUNT } from '../data/raiKnowledge';

const AGRONOMIC_SYNONYMS: Record<string, string[]> = {
  sinchai: ['irrigation', 'watering', 'water', 'सिंचाई'],
  irrigation: ['sinchai', 'watering', 'water', 'सिंचाई'],
  'सिंचाई': ['irrigation', 'sinchai', 'watering'],
  jalbhav: ['waterlogging', 'drainage', 'submergence', 'जलभराव'],
  jalbharav: ['waterlogging', 'drainage', 'submergence', 'जलभराव'],
  waterlogging: ['jalbhav', 'jalbharav', 'drainage', 'जलभराव'],
  'जलभराव': ['waterlogging', 'drainage', 'jalbhav'],
  drainage: ['jalnikasi', 'waterlogging', 'जल निकासी'],
  gehun: ['wheat', 'गेहूं'],
  wheat: ['gehun', 'गेहूं'],
  'गेहूं': ['wheat', 'gehun'],
  dhan: ['rice', 'paddy', 'धान'],
  paddy: ['rice', 'dhan', 'धान'],
  rice: ['dhan', 'paddy', 'धान'],
  'धान': ['rice', 'paddy', 'dhan'],
  urea: ['fertilizer', 'nitrogen', 'khad', 'उर्वरक'],
  dap: ['fertilizer', 'phosphorus', 'khad', 'उर्वरक'],
  fertilizer: ['urea', 'dap', 'khad', 'उर्वरक', 'खाद'],
  'उर्वरक': ['fertilizer', 'urea', 'dap', 'khad'],
  'खाद': ['fertilizer', 'urea', 'dap', 'khad'],
  pesticide: ['spray', 'kitnashak', 'कीटनाशक', 'छिड़काव'],
  spray: ['pesticide', 'chhidkaw', 'छिड़काव'],
  'कीटनाशक': ['pesticide', 'insecticide', 'spray'],
  'छिड़काव': ['spray', 'spraying', 'pesticide'],
  sowing: ['buwai', 'planting', 'बुवाई'],
  buwai: ['sowing', 'planting', 'बुवाई'],
  'बुवाई': ['sowing', 'buwai', 'planting'],
  soil: ['mitti', 'clayey', 'loam', 'मिट्टी'],
  mitti: ['soil', 'मिट्टी'],
  'मिट्टी': ['soil', 'mitti'],
  kisan: ['farmer', 'grower', 'किसान'],
  farmer: ['kisan', 'agriculture', 'किसान'],
  'किसान': ['farmer', 'kisan'],
};

export class RaiKnowledgeService {
  private static instance: RaiKnowledgeService;
  private items: RaiKnowledgeItem[] = [];
  private invertedIndex: Map<string, number[]> = new Map();
  private exactQuestionMap: Map<string, number> = new Map();
  private initialized = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): RaiKnowledgeService {
    if (!RaiKnowledgeService.instance) {
      RaiKnowledgeService.instance = new RaiKnowledgeService();
    }
    return RaiKnowledgeService.instance;
  }

  public getTotalKnowledgeCount(): number {
    return this.items.length || RAI_TOTAL_KNOWLEDGE_COUNT;
  }

  public getCategoryCount(): number {
    return Object.keys(RAI_KNOWLEDGE_PARTITIONS).length;
  }

  public getPartitionCategories(): string[] {
    return Object.keys(RAI_KNOWLEDGE_PARTITIONS);
  }

  private init() {
    if (this.initialized) return;
    this.items = getAllRaiKnowledgeItems();
    this.buildIndex();
    this.initialized = true;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    const rawTokens = this.normalizeText(text)
      .split(' ')
      .filter((t) => t.length > 0 && !STOP_WORDS.has(t));

    const expandedTokens = new Set<string>(rawTokens);
    // Multilingual agronomic synonym expansion
    for (const tok of rawTokens) {
      const syns = AGRONOMIC_SYNONYMS[tok];
      if (syns) {
        for (const s of syns) {
          const norm = this.normalizeText(s);
          if (norm && !STOP_WORDS.has(norm)) {
            expandedTokens.add(norm);
          }
        }
      }
    }

    return Array.from(expandedTokens);
  }

  private buildIndex() {
    this.invertedIndex.clear();
    this.exactQuestionMap.clear();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item) continue;
      const normalizedQ = this.normalizeText(item.question);
      this.exactQuestionMap.set(normalizedQ, i);

      const tokens = new Set<string>([
        ...this.tokenize(item.question),
        ...item.keywords.map((k) => this.normalizeText(k)).filter(Boolean),
        this.normalizeText(item.category),
        this.normalizeText(item.subCategory),
      ]);

      for (const token of tokens) {
        if (!token) continue;
        let list = this.invertedIndex.get(token);
        if (!list) {
          list = [];
          this.invertedIndex.set(token, list);
        }
        list.push(i);
      }
    }
  }

  /**
   * Search knowledge base using inverted-index TF-IDF ranking with exact match boosting
   * and 1.75x Farmer Persona Category Boosting for agriculture domains.
   */
  public search(
    query: string,
    options?: {
      category?: string;
      topK?: number;
      minScore?: number;
      requiresLiveData?: boolean;
      persona?: 'FARMER' | 'CITIZEN' | 'user' | 'farmer';
      isFarmer?: boolean;
    }
  ): KnowledgeSearchResult[] {
    this.init();

    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 1.5;
    const category = options?.category;
    const isFarmerContext =
      options?.isFarmer === true ||
      options?.persona === 'FARMER' ||
      options?.persona === 'farmer';
    const normalizedQ = this.normalizeText(query);

    // 1. Direct Exact Match Boost (Score = 100)
    const exactIndex = this.exactQuestionMap.get(normalizedQ);
    if (exactIndex !== undefined) {
      const item = this.items[exactIndex];
      if (item && (!category || item.category === category)) {
        let score = 100.0;
        if (
          isFarmerContext &&
          (item.category === 'AGRICULTURE' ||
            item.category === 'PRACTICAL_ACTIONS' ||
            item.category === 'RAINFALL_FORECAST')
        ) {
          score *= 1.75;
        }
        return [
          {
            item,
            score,
            matchedKeywords: item.keywords,
          },
        ];
      }
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const candidateScores = new Map<number, { score: number; matchedKeywords: Set<string> }>();

    for (const token of queryTokens) {
      const postingList = this.invertedIndex.get(token);
      if (!postingList) continue;

      // Inverse Document Frequency weight
      const idf = Math.log(1 + (this.items.length - postingList.length + 0.5) / (postingList.length + 0.5));
      const termWeight = Math.max(0.5, idf);

      for (const idx of postingList) {
        const item = this.items[idx];
        if (!item) continue;
        if (category && item.category !== category) continue;
        if (options?.requiresLiveData !== undefined && item.requiresLiveData !== options.requiresLiveData) continue;

        let entry = candidateScores.get(idx);
        if (!entry) {
          entry = { score: 0, matchedKeywords: new Set() };
          candidateScores.set(idx, entry);
        }

        entry.score += termWeight;
        entry.matchedKeywords.add(token);

        // Boost if token appears in question title directly
        if (item.question.toLowerCase().includes(token)) {
          entry.score += 1.0;
        }

        // Boost if token matches a defined keyword
        if (item.keywords.some((k) => k.toLowerCase().includes(token))) {
          entry.score += 1.5;
        }
      }
    }

    // Convert to sorted result list with Farmer Persona 1.75x Boosting
    const results: KnowledgeSearchResult[] = [];
    for (const [idx, { score, matchedKeywords }] of candidateScores.entries()) {
      const item = this.items[idx];
      if (!item) continue;

      // Contextual entity match boost
      let finalScore = score;
      const matchedRatio = matchedKeywords.size / queryTokens.length;
      finalScore *= 1 + matchedRatio;

      // 1.75x Farmer Persona Category Boosting
      if (
        isFarmerContext &&
        (item.category === 'AGRICULTURE' ||
          item.category === 'PRACTICAL_ACTIONS' ||
          item.category === 'RAINFALL_FORECAST')
      ) {
        finalScore *= 1.75;
      }

      if (finalScore >= minScore) {
        results.push({
          item,
          score: finalScore,
          matchedKeywords: Array.from(matchedKeywords),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Find single best matching knowledge concept.
   */
  public findBestMatch(
    query: string,
    options?: {
      category?: string;
      minScore?: number;
      persona?: 'FARMER' | 'CITIZEN' | 'user' | 'farmer';
      isFarmer?: boolean;
    }
  ): KnowledgeSearchResult | null {
    const results = this.search(query, {
      ...options,
      topK: 1,
    });
    return results.length > 0 && results[0] ? results[0] : null;
  }
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'there', 'what', 'which', 'who', 'how', 'when'
]);

export const knowledgeService = RaiKnowledgeService.getInstance();
