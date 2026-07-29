export interface ModuleRequestOptions {
  refresh?: boolean;
}

export interface ModuleRequestCache {
  request<T>(
    workId: string,
    module: string,
    requestKey: string,
    loader: () => Promise<T> | T,
    options?: ModuleRequestOptions
  ): Promise<T>;
  invalidate(workId: string, module: string): void;
  clear(): void;
}

export function createModuleRequestCache(): ModuleRequestCache;
