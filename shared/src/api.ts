export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportResult {
  workflow_id: string;
  name: string;
  node_count: number;
  unsupported_nodes: string[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ node?: string; field?: string; message: string }>;
  warnings: Array<{ node?: string; message: string }>;
  nodeSupport: Array<{ name: string; type: string; level: string }>;
}
