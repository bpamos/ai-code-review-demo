const { addTodo, getAllTodos, deleteTodo, resetTodos, completeTodo } = require('../src/api');

beforeEach(() => {
  resetTodos();
});

describe('addTodo', () => {
  test('happy path: adds a todo and returns it with an id', () => {
    const todo = addTodo('Buy groceries');

    expect(todo).toEqual({
      id: 1,
      text: 'Buy groceries',
      completed: false,
    });
    expect(getAllTodos()).toHaveLength(1);
  });

  test('error case: rejects empty string', () => {
    expect(() => addTodo('')).toThrow('Todo text is required and must be a non-empty string');
  });

  test('error case: rejects non-string input', () => {
    expect(() => addTodo(null)).toThrow('Todo text is required and must be a non-empty string');
  });
});

describe('getAllTodos', () => {
  test('happy path: returns all todos as a defensive copy', () => {
    addTodo('First');
    addTodo('Second');

    const result = getAllTodos();

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('First');
    expect(result[1].text).toBe('Second');

    // Mutating the returned array must not affect internal state
    result.pop();
    expect(getAllTodos()).toHaveLength(2);
  });

  test('error case: returns empty array when no todos exist', () => {
    expect(getAllTodos()).toEqual([]);
  });
});

describe('deleteTodo', () => {
  test('happy path: removes and returns the matching todo', () => {
    const first = addTodo('Keep me');
    addTodo('Delete me');

    const deleted = deleteTodo(first.id);

    expect(deleted.text).toBe('Keep me');
    expect(getAllTodos()).toHaveLength(1);
    expect(getAllTodos()[0].text).toBe('Delete me');
  });

  test('error case: throws when id does not exist', () => {
    addTodo('Only todo');

    expect(() => deleteTodo(999)).toThrow('Todo with id 999 not found');
  });

  test('error case: throws when id is invalid', () => {
    expect(() => deleteTodo('abc')).toThrow('Todo id must be a positive integer');
    expect(() => deleteTodo(-1)).toThrow('Todo id must be a positive integer');
  });
});

describe('completeTodo', () => {
  test('happy path: marks a todo as completed', () => {
    const todo = addTodo('Finish demo');

    const completed = completeTodo(todo.id);

    expect(completed).toEqual({
      id: todo.id,
      text: 'Finish demo',
      completed: true,
    });
    expect(getAllTodos()[0].completed).toBe(true);
  });

  test('error case: throws when id does not exist', () => {
    addTodo('Only todo');

    expect(() => completeTodo(999)).toThrow('Todo with id 999 not found');
  });

  test('error case: throws when id is invalid', () => {
    expect(() => completeTodo('abc')).toThrow('Todo id must be a positive integer');
    expect(() => completeTodo(-1)).toThrow('Todo id must be a positive integer');
  });
});
