import { UserLocation } from './location';
import { RaiWeatherData } from './weather';

export interface ChatMessage {
  readonly id: string;
  readonly sender: 'user' | 'rai';
  readonly text: string;
  readonly timestamp: string;
  readonly metadata?: {
    readonly locationCity?: string;
    readonly dataSource?: string;
    readonly weatherTimestamp?: string;
  };
}

export interface IntelligenceQueryContext {
  readonly user?: {
    readonly name?: string;
  };
  readonly location: UserLocation;
  readonly weatherData: RaiWeatherData | null;
  readonly language?: 'en' | 'hi';
  readonly conversationHistory: readonly {
    readonly sender: 'user' | 'rai';
    readonly text: string;
  }[];
}

export interface IntelligenceResponse {
  readonly text: string;
  readonly source: string;
  readonly weatherTimestamp: string;
}
