import { z } from 'zod';

type TaskType = 'command' | 'script' | 'query';

// Interfaces for type safety
export interface ITaskMessage {
  id: string;
  type: TaskType;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

class TaskMessage implements ITaskMessage {
  id: string;
  type: TaskType;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  metadata?: Record<string, unknown>;

  private static schema = z.object({
    id: z.string().uuid(),
    type: z.enum(['command', 'script', 'query']),
    command: z.string(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeout: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  constructor(init: ITaskMessage) {
    this.id = init.id;
    this.type = init.type;
    this.command = init.command;
    this.args = init.args;
    this.cwd = init.cwd;
    this.env = init.env;
    this.timeout = init.timeout;
    this.metadata = init.metadata;
  }

  validate(): { success: boolean; error?: Error } {
    const result = TaskMessage.schema.safeParse(this);
    return {
      success: result.success,
      error: result.success ? undefined : new Error(result.error.toString())
    };
  }

  toJSON(): ITaskMessage {
    return {
      id: this.id,
      type: this.type,
      command: this.command,
      ...(this.args && { args: this.args }),
      ...(this.cwd && { cwd: this.cwd }),
      ...(this.env && { env: this.env }),
      ...(this.timeout !== undefined && { timeout: this.timeout }),
      ...(this.metadata && { metadata: this.metadata }),
    };
  }

  static fromJSON(json: unknown): TaskMessage {
    const result = TaskMessage.schema.safeParse(json);
    if (!result.success) {
      throw new Error(`Invalid TaskMessage: ${result.error.message}`);
    }
    return new TaskMessage(result.data);
  }
}

export interface ITaskResultMessage {
  taskId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timestamp: string;
}

class TaskResultMessage implements ITaskResultMessage {
  taskId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timestamp: string;

  private static schema = z.object({
    taskId: z.string().uuid(),
    exitCode: z.number().int(),
    stdout: z.string(),
    stderr: z.string(),
    duration: z.number().nonnegative(),
    timestamp: z.string().datetime(),
  });

  constructor(init: ITaskResultMessage) {
    this.taskId = init.taskId;
    this.exitCode = init.exitCode;
    this.stdout = init.stdout;
    this.stderr = init.stderr;
    this.duration = init.duration;
    this.timestamp = init.timestamp;
  }

  validate(): { success: boolean; error?: Error } {
    const result = TaskResultMessage.schema.safeParse(this);
    return {
      success: result.success,
      error: result.success ? undefined : new Error(result.error.toString())
    };
  }

  toJSON(): ITaskResultMessage {
    return {
      taskId: this.taskId,
      exitCode: this.exitCode,
      stdout: this.stdout,
      stderr: this.stderr,
      duration: this.duration,
      timestamp: this.timestamp,
    };
  }

  static fromJSON(json: unknown): TaskResultMessage {
    const result = TaskResultMessage.schema.safeParse(json);
    if (!result.success) {
      throw new Error(`Invalid TaskResultMessage: ${result.error.message}`);
    }
    return new TaskResultMessage(result.data);
  }
}

type MessageType = 'task' | 'result';

interface IMessageBase<T extends MessageType, P> {
  type: T;
  payload: P;
}

type TaskMessageType = IMessageBase<'task', ITaskMessage>;
type ResultMessageType = IMessageBase<'result', ITaskResultMessage>;

type MessageUnion = TaskMessageType | ResultMessageType;

class Message {
  type: MessageType;
  payload: TaskMessage | TaskResultMessage;

  private constructor(type: MessageType, payload: TaskMessage | TaskResultMessage) {
    this.type = type;
    this.payload = payload;
  }

  static createTaskMessage(task: TaskMessage): Message {
    return new Message('task', task);
  }

  static createResultMessage(result: TaskResultMessage): Message {
    return new Message('result', result);
  }

  static fromJSON(json: unknown): Message {
    const schema = z.object({
      type: z.enum(['task', 'result']),
      payload: z.unknown(),
    });

    const result = schema.safeParse(json);
    if (!result.success) {
      throw new Error(`Invalid message format: ${result.error.message}`);
    }

    const { type, payload } = result.data;

    try {
      if (type === 'task') {
        const task = TaskMessage.fromJSON(payload);
        return Message.createTaskMessage(task);
      } else {
        const result = TaskResultMessage.fromJSON(payload);
        return Message.createResultMessage(result);
      }
    } catch (error) {
      throw new Error(`Failed to parse message payload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validate(): { success: boolean; error?: Error } {
    return this.payload.validate();
  }

  toJSON() {
    return {
      type: this.type,
      payload: this.payload.toJSON(),
    };
  }
}

export { TaskMessage, TaskResultMessage, Message };

export type { TaskType };
