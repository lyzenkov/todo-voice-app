import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: Date
}

// Тип для сохранения в localStorage
interface SerializedTodo {
  id: number
  text: string
  completed: boolean
  createdAt: string
}

export const useTodoStore = defineStore('todo', () => {
  // todos уже является ref, поэтому в компоненте не нужно использовать .value
  const todos = ref<Todo[]>([])
  const selectedTodoId = ref<number | null>(null)

  // Загрузка из localStorage
  const loadTodos = () => {
    const saved = localStorage.getItem('todos')
    if (saved) {
      const parsed = JSON.parse(saved) as SerializedTodo[]
      todos.value = parsed.map(todo => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }))
    }
  }

  // Сохранение в localStorage
  const saveTodos = () => {
    const toSave: SerializedTodo[] = todos.value.map(todo => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
      createdAt: todo.createdAt.toISOString()
    }))
    localStorage.setItem('todos', JSON.stringify(toSave))
  }

  // Добавить запись
  const addTodo = (text: string) => {
    if (!text.trim()) return
    const newTodo: Todo = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    }
    todos.value.push(newTodo)
    saveTodos()
  }

  // Выбрать запись
  const selectTodo = (id: number) => {
    selectedTodoId.value = id
  }

  // Пометить выполненным
  const completeTodo = (id: number) => {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = true
      saveTodos()
    }
  }

  // Снять пометку выполненного
  const uncompleteTodo = (id: number) => {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = false
      saveTodos()
    }
  }

  // Удалить запись
  const deleteTodo = (id: number) => {
    const index = todos.value.findIndex(t => t.id === id)
    if (index !== -1) {
      todos.value.splice(index, 1)
      if (selectedTodoId.value === id) {
        selectedTodoId.value = null
      }
      saveTodos()
    }
  }

  // Выбранный todo объект
  const selectedTodo = computed(() => {
    if (!selectedTodoId.value) return null
    return todos.value.find(t => t.id === selectedTodoId.value) || null
  })

  // Статистика
  const stats = computed(() => ({
    total: todos.value.length,
    completed: todos.value.filter(t => t.completed).length,
    active: todos.value.filter(t => !t.completed).length
  }))

  loadTodos()

  return {
    todos,           // Это уже ref, в компоненте используем просто todos (не todos.value)
    selectedTodoId,  // Это уже ref
    selectedTodo,    // Это computed
    stats,          // Это computed
    addTodo,
    selectTodo,
    completeTodo,
    uncompleteTodo,
    deleteTodo
  }
})