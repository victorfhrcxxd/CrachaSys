declare module 'busboy' {
  import type { Writable } from 'stream';
  import type { IncomingHttpHeaders } from 'http';

  interface BusboyConfig {
    headers: IncomingHttpHeaders;
    limits?: {
      fileSize?: number;
      files?: number;
      fields?: number;
    };
  }

  interface FileInfo {
    filename: string;
    encoding: string;
    mimeType: string;
  }

  interface Busboy extends Writable {
    on(event: 'file', listener: (fieldname: string, stream: NodeJS.ReadableStream, info: FileInfo) => void): this;
    on(event: 'field', listener: (name: string, value: string) => void): this;
    on(event: 'finish', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  function busboy(config: BusboyConfig): Busboy;
  export = busboy;
}
