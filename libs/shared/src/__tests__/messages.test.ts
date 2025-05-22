import { Message, TaskMessage, TaskResultMessage } from '../types/messages';

describe('Message Classes', () => {
  describe('TaskMessage', () => {
    it('should create a valid task message', () => {
      const task = new TaskMessage({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'command',
        command: 'ls',
        args: ['-la'],
        cwd: '/home/user',
      });

      const validation = task.validate();
      expect(validation.success).toBe(true);
      expect(task.toJSON()).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'command',
        command: 'ls',
        args: ['-la'],
        cwd: '/home/user',
      });
    });

    it('should validate task message from JSON', () => {
      const json = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'command',
        command: 'ls',
      };

      const task = TaskMessage.fromJSON(json);
      expect(task).toBeInstanceOf(TaskMessage);
      expect(task.validate().success).toBe(true);
    });

    it('should throw on invalid task message', () => {
      const invalidTask = {
        id: 'not-a-uuid',
        type: 'invalid-type',
      };

      expect(() => TaskMessage.fromJSON(invalidTask)).toThrow();
    });
  });

  describe('TaskResultMessage', () => {
    it('should create a valid task result message', () => {
      const timestamp = new Date().toISOString();
      const result = new TaskResultMessage({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        exitCode: 0,
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        duration: 42,
        timestamp,
      });

      const validation = result.validate();
      expect(validation.success).toBe(true);
      expect(result.toJSON()).toMatchObject({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        exitCode: 0,
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        duration: 42,
        timestamp,
      });
    });
  });

  describe('Message', () => {
    it('should create a task message', () => {
      const task = new TaskMessage({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'command',
        command: 'ls',
      });

      const message = Message.createTaskMessage(task);
      expect(message.type).toBe('task');
      expect(message.payload).toBeInstanceOf(TaskMessage);
      expect(message.validate().success).toBe(true);
    });

    it('should create a result message', () => {
      const result = new TaskResultMessage({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        duration: 1,
        timestamp: new Date().toISOString(),
      });

      const message = Message.createResultMessage(result);
      expect(message.type).toBe('result');
      expect(message.payload).toBeInstanceOf(TaskResultMessage);
      expect(message.validate().success).toBe(true);
    });

    it('should parse message from JSON', () => {
      const taskJson = {
        type: 'task',
        payload: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'command',
          command: 'ls',
        },
      };

      const message = Message.fromJSON(taskJson);
      expect(message.type).toBe('task');
      expect(message.payload).toBeInstanceOf(TaskMessage);
    });
  });
});
