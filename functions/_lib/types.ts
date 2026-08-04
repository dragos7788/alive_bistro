export interface Env {
  DB: {
    prepare(sql: string): D1Stmt
    batch(stmts: D1Stmt[]): Promise<{ results: Record<string, unknown>[] }[]>
  }
  MEDIA: {
    put(key: string, body: ArrayBuffer, opts: { httpMetadata: { contentType: string } }): Promise<void>
    get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>
    delete(key: string): Promise<void>
  }
}

interface D1Stmt {
  bind(...args: unknown[]): D1Stmt
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<{ success: boolean }>
}

export interface Ctx<P extends string = string> {
  request: Request
  env: Env
  params: Record<P, string>
}
