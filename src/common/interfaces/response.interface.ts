export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
  details?: string;
}

export interface ErrorDetail {
  field?: string;
  reason?: string;
  value?: any;
}