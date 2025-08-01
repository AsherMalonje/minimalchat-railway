import { useState, useEffect } from 'react';
import './App.css';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

type FilterType = 'all' | 'active' | 'completed';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('mobile-todos');
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }));
      setTodos(parsedTodos);
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('mobile-todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (inputText.trim() === '') return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputText.trim(),
      completed: false,
      createdAt: new Date(),
      priority
    };

    setTodos([newTodo, ...todos]);
    setInputText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (editText.trim() === '') return;
    
    setTodos(todos.map(todo =>
      todo.id === editingId ? { ...todo, text: editText.trim() } : todo
    ));
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const completedTodosCount = todos.filter(todo => todo.completed).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa726';
      case 'low': return '#66bb6a';
      default: return '#66bb6a';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '🌱';
      default: return '🌱';
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="title">
          <span className="icon">✓</span>
          TodoMobile
        </h1>
        <div className="stats">
          <span className="stat active">{activeTodosCount} active</span>
          <span className="stat completed">{completedTodosCount} done</span>
        </div>
      </header>

      {/* Add Todo Section */}
      <section className="add-section">
        <div className="priority-selector">
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              className={`priority-btn ${priority === p ? 'active' : ''}`}
              onClick={() => setPriority(p)}
              style={{ 
                backgroundColor: priority === p ? getPriorityColor(p) : undefined,
                borderColor: getPriorityColor(p)
              }}
            >
              {getPriorityIcon(p)} {p}
            </button>
          ))}
        </div>
        
        <div className="input-section">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="What needs to be done?"
            className="todo-input"
          />
          <button onClick={addTodo} className="add-btn">
            <span>+</span>
          </button>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="filter-section">
        {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${todos.length})` : 
             f === 'active' ? `Active (${activeTodosCount})` : 
             `Done (${completedTodosCount})`}
          </button>
        ))}
      </section>

      {/* Todo List */}
      <section className="todos-section">
        {filteredTodos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {filter === 'all' ? '📝' : filter === 'active' ? '⏳' : '🎉'}
            </div>
            <p className="empty-text">
              {filter === 'all' 
                ? 'No todos yet. Add your first task above!'
                : filter === 'active'
                ? 'No active tasks. Time to relax!'
                : 'No completed tasks yet. Keep going!'
              }
            </p>
          </div>
        ) : (
          <div className="todo-list">
            {filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''}`}
              >
                <div className="todo-main">
                  <button
                    className={`check-btn ${todo.completed ? 'checked' : ''}`}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.completed ? '✓' : ''}
                  </button>
                  
                  <div className="todo-content">
                    {editingId === todo.id ? (
                      <div className="edit-input">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <div 
                          className="todo-text"
                          onDoubleClick={() => startEdit(todo.id, todo.text)}
                        >
                          {todo.text}
                        </div>
                        <div className="todo-meta">
                          <span 
                            className="priority-badge"
                            style={{ 
                              backgroundColor: getPriorityColor(todo.priority),
                              color: 'white'
                            }}
                          >
                            {getPriorityIcon(todo.priority)} {todo.priority}
                          </span>
                          <span className="todo-date">
                            {todo.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="todo-actions">
                  {editingId === todo.id ? (
                    <>
                      <button className="save-btn" onClick={saveEdit}>✓</button>
                      <button className="cancel-btn" onClick={cancelEdit}>✕</button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="edit-btn"
                        onClick={() => startEdit(todo.id, todo.text)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Action Footer */}
      {completedTodosCount > 0 && (
        <footer className="footer">
          <button className="clear-btn" onClick={clearCompleted}>
            Clear {completedTodosCount} completed task{completedTodosCount > 1 ? 's' : ''}
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;
