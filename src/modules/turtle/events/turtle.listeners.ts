import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TURTLE_EVENTS,
  type TurtleCreatedEvent,
  type TurtleDeletedEvent,
  type TurtleUpdatedEvent,
} from './turtle.events';

@Injectable()
export class TurtleEventListeners {
  private readonly logger = new Logger(TurtleEventListeners.name);

  @OnEvent(TURTLE_EVENTS.CREATED)
  handleCreated(event: TurtleCreatedEvent) {
    this.logger.log(`Turtle created: ${event.name} (${event.id})`);
  }

  @OnEvent(TURTLE_EVENTS.UPDATED)
  handleUpdated(event: TurtleUpdatedEvent) {
    this.logger.log(`Turtle updated: ${event.id} — ${JSON.stringify(event.changes)}`);
  }

  @OnEvent(TURTLE_EVENTS.DELETED)
  handleDeleted(event: TurtleDeletedEvent) {
    this.logger.log(`Turtle deleted: ${event.id}`);
  }
}
