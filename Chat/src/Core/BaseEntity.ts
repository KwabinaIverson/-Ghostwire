import { v4 as uuidv7 } from 'uuid';

/**
 * BaseEntity is an abstract class that provides common properties and logic
 * for all entities in the application. It ensures each entity has a unique ID,
 * as well as timestamps for creation and last update.
 *
 * Properties:
 * - id: A unique identifier generated using uuidv7.
 * - createdAt: The date and time when the entity was created.
 * - updatedAt: The date and time when the entity was last updated.
 *
 * Usage:
 * Extend this class in your domain models to inherit these properties.
 *
 * Example:
 *   class User extends BaseEntity { ... }
 */
export abstract class BaseEntity {
  /**
   * A unique identifier for the entity, generated using uuidv7.
   */
  protected id: string;

  /**
   * The date and time when the entity was created.
   */
  protected createdAt: Date;

  /**
   * The date and time when the entity was last updated.
   */
  protected updatedAt: Date;

  constructor() {
    this.id = uuidv7();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}