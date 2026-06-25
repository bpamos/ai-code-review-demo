/**
 * Simple in-memory todo API.
 * Items are stored in a module-level array and reset when the process restarts.
 */

/** @type {Array<{ id: number, text: string, completed: boolean }>} */
let todos = [];

/** @type {number} Next auto-increment id for new todos */
let nextId = 1;

/**
 * Add a new todo item to the in-memory store.
 *
 * @param {string} text - The todo description text
 * @returns {{ id: number, text: string, completed: boolean }} The created todo item
 * @throws {Error} If text is missing, not a string, or empty after trimming
 */
function addTodo(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('Todo text is required and must be a non-empty string');
  }

  const todo = {
    id: nextId++,
    text: text.trim(),
    completed: false,
  };

  todos.push(todo);
  return todo;
}

/**
 * Retrieve all todo items currently stored in memory.
 *
 * @returns {Array<{ id: number, text: string, completed: boolean }>} A copy of all todos
 */
function getAllTodos() {
  return todos.map((todo) => ({ ...todo }));
}

/**
 * Delete a todo item by its numeric id.
 *
 * @param {number} id - The id of the todo to delete
 * @returns {{ id: number, text: string, completed: boolean }} The deleted todo item
 * @throws {Error} If id is invalid or no todo with that id exists
 */
function deleteTodo(id) {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error('Todo id must be a positive integer');
  }

  const index = todos.findIndex((todo) => todo.id === id);
  if (index === -1) {
    throw new Error(`Todo with id ${id} not found`);
  }

  const [deleted] = todos.splice(index, 1);
  return deleted;
}

/**
 * Reset the in-memory store. Exported for test isolation only.
 */
function resetTodos() {
  todos = [];
  nextId = 1;
}

/**
 * Mark a todo item as completed by id.
 *
 * @param {number} id - The id of the todo to complete
 * @returns {{ id: number, text: string, completed: boolean }} The updated todo
 * @throws {Error} If id is invalid or the todo is not found
 */
function completeTodo(id) {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error('Todo id must be a positive integer');
  }

  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    throw new Error(`Todo with id ${id} not found`);
  }

  todo.completed = true;
  return { ...todo };
}

module.exports = {
  addTodo,
  getAllTodos,
  deleteTodo,
  resetTodos,
  completeTodo,
};
