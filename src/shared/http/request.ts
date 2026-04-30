import { FastifyRequest } from 'fastify';

type DefaultContext = Record<string, unknown>;

type RequestContexts = {
  Params: DefaultContext;
  Querystring: DefaultContext;
  Headers: DefaultContext;
  Body: unknown;
};

export type NestFastifyRequest = FastifyRequest<RequestContexts>;

export const getHeader = (request: NestFastifyRequest, header: string) => {
  const normalized = header.toLowerCase();
  const headers = request.headers ?? {};
  return headers[normalized as keyof typeof headers];
};
