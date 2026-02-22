const bcrypt = require('bcrypt');
const knex = require('../db/knex');

const SALT_ROUNDS = 12;

class User {
  #passwordHash = null; // private field (never exposed)

  /**
   * Constructor
   * Accepts raw DB row and maps database columns
   * to clean API-facing properties.
   */
  constructor({ user_id, username, password_hash }) {
    // Support both "id" and "user_id"
    this.id = user_id;
    this.username = username;
    this.#passwordHash = password_hash;
  }

  /**
   * Instance method:
   * Validate password against stored hash
   */
  async isValidPassword(password) {
    return bcrypt.compare(password, this.#passwordHash);
  }

  /**
   * Create a new user (hash password before storing)
   */
  static async create(username, password) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const query = `
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
      RETURNING *
    `;

    const result = await knex.raw(query, [username, passwordHash]);
    const rawUserData = result.rows[0];

    return new User(rawUserData);
  }

  /**
   * Return all users
   */
  static async list() {
    const query = `SELECT * FROM users`;
    const result = await knex.raw(query);

    return result.rows.map((row) => new User(row));
  }

  /**
   * Find user by id
   */
  static async find(id) {
    const query = `
      SELECT *
      FROM users
      WHERE user_id = ?
    `;

    const result = await knex.raw(query, [id]);
    const rawUserData = result.rows[0];

    return rawUserData ? new User(rawUserData) : null;
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const query = `
      SELECT *
      FROM users
      WHERE username = ?
    `;

    const result = await knex.raw(query, [username]);
    const rawUserData = result.rows[0];

    return rawUserData ? new User(rawUserData) : null;
  }

  /**
   * Update username
   */
  static async update(id, username) {
    const query = `
      UPDATE users
      SET username = ?
      WHERE user_id = ?
      RETURNING *
    `;

    const result = await knex.raw(query, [username, id]);
    const rawUpdatedUser = result.rows[0];

    return rawUpdatedUser ? new User(rawUpdatedUser) : null;
  }

  /**
   * Delete all users (test utility)
   */
  static async deleteAll() {
    return knex('users').del();
  }
}

module.exports = User;