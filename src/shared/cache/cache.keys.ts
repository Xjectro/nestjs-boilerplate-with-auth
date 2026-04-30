export type CacheKeyBuilder = {
  all: () => string;
  one: (id: string) => string;
};

export const createCacheKeyBuilder = (
  namespace: string,
  options: { separator?: string; listSuffix?: string } = {},
): CacheKeyBuilder => {
  const separator = options.separator ?? '_';
  const listKey = options.listSuffix ? `${namespace}${options.listSuffix}` : namespace;

  return {
    all: () => listKey,
    one: (id: string) => `${namespace}${separator}${id}`,
  };
};
