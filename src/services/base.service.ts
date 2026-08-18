import { HttpClient } from '../api/client';
import { apiClient } from '../api';

export abstract class BaseService {
  protected readonly http: HttpClient;

  constructor(customClient?: HttpClient) {
    this.http = customClient || apiClient;
  }
}
