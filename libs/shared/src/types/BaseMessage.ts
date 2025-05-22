import { z, ZodSchema, ZodType } from 'zod';

type Constructor<T> = new (...args: any[]) => T;

export abstract class BaseMessage<T> {
  protected abstract getSchema(): ZodSchema<T>;

  validate(): { success: boolean; error?: z.ZodError } {
    const result = this.getSchema().safeParse(this);
    return {
      success: result.success,
      error: result.success ? undefined : result.error,
    };
  }

  toJSON(): T {
    return { ...(this as unknown as object) } as T;
  }

  static getSchema<T>(): ZodType<T> {
    throw new Error('getSchema must be implemented by subclasses');
  }

  static fromJSON<T extends object>(
    this: Constructor<BaseMessage<T>> & { getSchema(): ZodType<T> },
    json: unknown
  ): BaseMessage<T> {
    const result = this.getSchema().safeParse(json);
    if (!result.success) {
      throw new Error(`Invalid message: ${result.error.message}`);
    }
    return new this(result.data);
  }
}
