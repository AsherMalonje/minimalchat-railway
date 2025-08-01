import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Edit2, Plus, CheckCircle2, Circle, Flame, Zap, Leaf, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

type FilterType = 'all' | 'active' | 'completed';

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
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
    localStorage.setItem('todos', JSON.stringify(todos));
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Flame className="w-4 h-4 text-red-500" />;
      case 'medium': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'low': return <Leaf className="w-4 h-4 text-green-500" />;
      default: return <Leaf className="w-4 h-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen relative shadow-xl">
      {/* Header with Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Todo</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {activeTodosCount} active • {completedTodosCount} done
        </p>
      </div>

      <div className="p-4 space-y-6">

      {/* Add Todo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority Selector */}
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <Button
                key={p}
                variant={priority === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriority(p)}
                className="flex items-center gap-1"
              >
                {getPriorityIcon(p)}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
          
          {/* Input Section */}
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="What needs to be done?"
              className="flex-1"
            />
            <Button onClick={addTodo} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({todos.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeTodosCount})</TabsTrigger>
          <TabsTrigger value="completed">Done ({completedTodosCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredTodos.length === 0 ? (
            <Alert>
              <AlertDescription className="text-center">
                {filter === 'all' 
                  ? 'No todos yet. Add your first task above!'
                  : filter === 'active'
                  ? 'No active tasks. Great job!'
                  : 'No completed tasks yet. Keep going!'
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredTodos.map((todo) => (
                <Card key={todo.id} className={`transition-all ${todo.completed ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTodo(todo.id)}
                        className="mt-0.5 p-0 h-6 w-6"
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        {editingId === todo.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onBlur={saveEdit}
                              className="flex-1"
                              autoFocus
                            />
                            <Button size="sm" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <p 
                              className={`cursor-pointer ${todo.completed ? 'line-through text-muted-foreground' : ''}`}
                              onDoubleClick={() => startEdit(todo.id, todo.text)}
                            >
                              {todo.text}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant={getPriorityColor(todo.priority)} className="flex items-center gap-1">
                                {getPriorityIcon(todo.priority)}
                                {todo.priority}
                              </Badge>
                              <span>{todo.createdAt.toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {editingId !== todo.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(todo.id, todo.text)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTodo(todo.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

        {/* Clear Completed Button */}
        {completedTodosCount > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="destructive" 
                onClick={clearCompleted}
                className="w-full"
              >
                Clear {completedTodosCount} completed task{completedTodosCount > 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}