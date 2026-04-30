export const TURTLE_EVENTS = {
  CREATED: 'turtle.created',
  UPDATED: 'turtle.updated',
  DELETED: 'turtle.deleted',
} as const;

export type TurtleCreatedEvent = {
  id: string;
  name: string;
  slug: string;
};

export type TurtleUpdatedEvent = {
  id: string;
  changes: Record<string, unknown>;
};

export type TurtleDeletedEvent = {
  id: string;
};
