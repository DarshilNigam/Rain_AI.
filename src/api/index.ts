import { HttpClient } from './client';
import { API_BASE_URL } from './endpoints';

export const apiClient = new HttpClient(API_BASE_URL);

export * from './client';
export * from './endpoints';
