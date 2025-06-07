// Extend the global namespace to include our test mocks
declare namespace NodeJS {
  interface Global {
    mocks: {
      database: {
        mockQuery: jest.Mock;
        mockGetPool: jest.Mock;
      };
    };
  }
}

// Make TypeScript aware of the global mocks
declare const mocks: {
  database: {
    mockQuery: jest.Mock;
    mockGetPool: jest.Mock;
  };
};
