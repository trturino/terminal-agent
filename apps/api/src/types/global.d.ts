// Global type declarations for the application

import { Mock } from 'jest-mock';

declare global {
  namespace NodeJS {
    interface Global {
      mocks: {
        database: {
          mockQuery: Mock<any, any>;
          mockGetPool: Mock<any, any>;
        };
      };
    }
  }
}
