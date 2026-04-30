// Normalize the environment when e2e tests run inside Docker.
process.env.NODE_ENV ??= 'test';

const defaultTimeout = Number(process.env.E2E_TEST_TIMEOUT ?? 30_000);

jest.setTimeout(defaultTimeout);
