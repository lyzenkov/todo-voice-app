<template>
  <div class="glass-container">
    <div class="header">
      <h1>✨ Голосовой ToDo</h1>
      <div class="stats">
        <span>📊 Всего: {{ stats.total }}</span>
        <span>✅ Выполнено: {{ stats.completed }}</span>
        <span>🔄 Активно: {{ stats.active }}</span>
      </div>
    </div>

    <div class="add-todo">
      <input
        v-model="newTodoText"
        @keyup.enter="handleAddTodo"
        type="text"
        placeholder="Что нужно сделать?"
        class="glass-input"
      />
      <button @click="handleAddTodo" class="glass-button">➕ Добавить</button>
    </div>

    <div class="voice-status" :class="{ active: isListening, supported: isSpeechSupported }">
      <span class="mic-icon">{{ isListening ? '🎤' : '🎙️' }}</span>
      <span>{{ getVoiceStatusText() }}</span>
      <button 
        v-if="isSpeechSupported"
        @click="toggleMicrophone" 
        class="microphone-toggle"
        :disabled="!isSpeechSupported"
      >
        {{ isListening ? '🔴 Выключить' : '🟢 Включить' }}
      </button>
      <div v-if="!isSpeechSupported" class="warning">
        ⚠️ Голосовые команды доступны в Chrome, Edge, Safari
      </div>
    </div>

    <div v-if="recognizedText" class="recognized-text">
      🎯 Распознано: "{{ recognizedText }}"
    </div>

    <div v-if="voiceCommandHint" class="voice-hint">
      💡 Подсказка: "Добавить запись купить хлеб", "Выбрать запись", "Пометить выполненным"
    </div>

    <div class="todo-list">
      <div
        v-for="todo in todos"
        :key="todo.id"
        class="todo-item"
        :class="{
          completed: todo.completed,
          selected: selectedTodoId === todo.id
        }"
        @click="handleSelectTodo(todo.id)"
      >
        <div class="todo-content">
          <span class="todo-text">{{ todo.text }}</span>
          <span class="todo-date">{{ formatDate(todo.createdAt) }}</span>
        </div>
        <div class="todo-actions">
          <button
            v-if="!todo.completed"
            @click.stop="handleCompleteTodo(todo.id)"
            class="icon-button complete"
            title="Пометить выполненным"
          >
            ✅
          </button>
          <button
            v-else
            @click.stop="handleUncompleteTodo(todo.id)"
            class="icon-button uncomplete"
            title="Снять пометку"
          >
            🔄
          </button>
          <button
            @click.stop="handleDeleteTodo(todo.id)"
            class="icon-button delete"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>

      <div v-if="!todos || todos.length === 0" class="empty-state">
        <p>📝 Нет задач. Добавьте первую или скажите "Добавить запись"</p>
      </div>
    </div>

    <div v-if="selectedTodo" class="selected-info">
      <h3>📌 Выбранная задача</h3>
      <p>{{ selectedTodo.text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useTodoStore, type Todo } from '../stores/todoStore'

const todoStore = useTodoStore()

const todos = computed(() => todoStore.todos || [])
const selectedTodoId = computed(() => todoStore.selectedTodoId)
const selectedTodo = computed(() => todoStore.selectedTodo)
const stats = computed(() => todoStore.stats)

const addTodo = todoStore.addTodo
const selectTodo = todoStore.selectTodo
const completeTodo = todoStore.completeTodo
const uncompleteTodo = todoStore.uncompleteTodo
const deleteTodo = todoStore.deleteTodo

const newTodoText = ref('')
const isListening = ref(false)
const recognizedText = ref('')
const voiceCommandHint = ref(true)
const isSpeechSupported = ref(true)

let recognition: any = null
let shouldRestart = false

// Проверка поддержки Web Speech API
const checkSpeechSupport = () => {
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition || 
                                (window as any).mozSpeechRecognition || 
                                (window as any).msSpeechRecognition
  
  if (!SpeechRecognitionAPI) {
    console.warn('Speech Recognition not supported')
    isSpeechSupported.value = false
    return false
  }
  return true
}

// Получение текста статуса
const getVoiceStatusText = () => {
  if (!isSpeechSupported.value) return '❌ Голосовое управление недоступно'
  if (isListening.value) return '🎤 Слушаю... Говорите команду'
  return 'Микрофон выключен'
}

// Инициализация распознавания речи
const initSpeechRecognition = () => {
  if (!checkSpeechSupport()) {
    return null
  }
  
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition
  
  const recognitionInstance = new SpeechRecognitionAPI()
  
  // Настройки для лучшего распознавания
  recognitionInstance.continuous = true      // Непрерывное распознавание
  recognitionInstance.interimResults = false // Только финальные результаты
  recognitionInstance.lang = 'ru-RU'         // Русский язык
  recognitionInstance.maxAlternatives = 1    // Один лучший результат
  
  return recognitionInstance
}

// Обработка голосовых команд
const processVoiceCommand = (command: string) => {
  const lowerCommand = command.toLowerCase().trim()
  console.log('Обработка команды:', lowerCommand)
  
  // Добавить запись
  if (lowerCommand.includes('добавить запись') || lowerCommand.includes('добавить')) {
    const patterns = [
      /добавить\s+запись\s+(.+)/i,
      /добавить\s+(.+)/i,
      /новая\s+задача\s+(.+)/i,
      /создать\s+(.+)/i
    ]
    
    let taskText = null
    for (const pattern of patterns) {
      const match = lowerCommand.match(pattern)
      if (match && match[1]) {
        taskText = match[1]
        break
      }
    }
    
    if (taskText) {
      addTodo(taskText)
      recognizedText.value = `✅ Добавлено: ${taskText}`
    } else {
      recognizedText.value = '❌ Скажите текст задачи, например: "Добавить запись купить молоко"'
    }
    setTimeout(() => { recognizedText.value = '' }, 4000)
    return
  }
  
  // Выбрать запись
  if (lowerCommand.includes('выбрать запись') || lowerCommand.includes('выбери')) {
    const match = lowerCommand.match(/выбрать\s+запись\s+(.+)/i) ||
                  lowerCommand.match(/выбери\s+(.+)/i)
    const todosList = todos.value
    
    if (!todosList || todosList.length === 0) {
      recognizedText.value = '❌ Нет задач для выбора'
      setTimeout(() => { recognizedText.value = '' }, 3000)
      return
    }
    
    if (match && match[1]) {
      const searchText = match[1]
      const foundTodo = todosList.find((t: Todo) => 
        t.text.toLowerCase().includes(searchText) && !t.completed
      )
      if (foundTodo) {
        selectTodo(foundTodo.id)
        recognizedText.value = `✅ Выбрана: ${foundTodo.text}`
      } else {
        recognizedText.value = `❌ Не найдена задача: ${searchText}`
      }
    } else {
      const activeTodos = todosList.filter((t: Todo) => !t.completed)
      if (activeTodos.length > 0) {
        const firstActiveTodo = activeTodos[0]
        if (firstActiveTodo && firstActiveTodo.id && firstActiveTodo.text) {
          selectTodo(firstActiveTodo.id)
          recognizedText.value = `✅ Выбрана: ${firstActiveTodo.text}`
        }
      } else {
        recognizedText.value = '❌ Нет активных задач для выбора'
      }
    }
    setTimeout(() => { recognizedText.value = '' }, 3000)
    return
  }
  
  // Пометить выполненным
  if (lowerCommand.includes('пометить выполненным') || 
      lowerCommand.includes('отметить выполненным') ||
      lowerCommand.includes('выполнено')) {
    const currentSelectedId = selectedTodoId.value
    if (currentSelectedId !== null && currentSelectedId !== undefined) {
      completeTodo(currentSelectedId)
      recognizedText.value = '✅ Задача помечена как выполненная'
    } else {
      recognizedText.value = '❌ Сначала выберите задачу'
    }
    setTimeout(() => { recognizedText.value = '' }, 3000)
    return
  }
  
  // Снять пометку выполненного
  if (lowerCommand.includes('снять пометку') || 
      lowerCommand.includes('вернуть задачу') ||
      lowerCommand.includes('отменить выполнение')) {
    const currentId = selectedTodoId.value
    
    if (currentId === null || currentId === undefined) {
      recognizedText.value = '❌ Сначала выберите задачу'
      setTimeout(() => { recognizedText.value = '' }, 3000)
      return
    }
    
    const todosArray: Todo[] = todos.value
    const foundTodo = todosArray.find((todo: Todo) => todo.id === currentId)
    
    if (foundTodo && foundTodo.completed === true) {
      uncompleteTodo(currentId)
      recognizedText.value = '✅ Пометка снята'
    } else if (foundTodo && foundTodo.completed === false) {
      recognizedText.value = 'ℹ️ Задача ещё не выполнена'
    } else {
      recognizedText.value = '❌ Задача не найдена'
    }
    
    setTimeout(() => { recognizedText.value = '' }, 3000)
    return
  }
  
  // Удалить запись
  if (lowerCommand.includes('удалить запись') || 
      lowerCommand.includes('удалить задачу') ||
      lowerCommand.includes('удали')) {
    const currentSelectedId = selectedTodoId.value
    if (currentSelectedId !== null && currentSelectedId !== undefined) {
      deleteTodo(currentSelectedId)
      recognizedText.value = '✅ Задача удалена'
    } else {
      recognizedText.value = '❌ Сначала выберите задачу'
    }
    setTimeout(() => { recognizedText.value = '' }, 3000)
    return
  }
  
  // Показать список команд
  if (lowerCommand.includes('помощь') || lowerCommand.includes('команды')) {
    recognizedText.value = '📋 Команды: "Добавить запись [текст]", "Выбрать запись [текст]", "Пометить выполненным", "Снять пометку", "Удалить запись", "Выключить микрофон"'
    setTimeout(() => { recognizedText.value = '' }, 8000)
    return
  }
  
  // Выключить микрофон
  if (lowerCommand.includes('выключить микрофон') || 
      lowerCommand.includes('стоп') ||
      lowerCommand.includes('хватит')) {
    if (isListening.value) {
      stopListening()
      recognizedText.value = '🔴 Микрофон выключен'
      setTimeout(() => { recognizedText.value = '' }, 2000)
    }
    return
  }
  
  // Неизвестная команда
  recognizedText.value = `❓ Неизвестная команда: "${command}". Скажите "помощь" для списка команд`
  setTimeout(() => { recognizedText.value = '' }, 5000)
}

// Запуск прослушивания
const startListening = () => {
  if (!recognition) {
    if (!checkSpeechSupport()) {
      recognizedText.value = '❌ Ваш браузер не поддерживает голосовое управление. Используйте Chrome, Edge или Safari'
      setTimeout(() => { recognizedText.value = '' }, 5000)
      return
    }
    recognition = initSpeechRecognition()
    if (!recognition) {
      recognizedText.value = '❌ Ошибка инициализации микрофона'
      return
    }
  }
  
  try {
    recognition.start()
    isListening.value = true
    recognizedText.value = '🎤 Слушаю... Говорите команду'
    setTimeout(() => { recognizedText.value = '' }, 2000)
    
    recognition.onstart = () => {
      console.log('Распознавание запущено')
    }
    
    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript
      console.log('Распознано:', transcript)
      processVoiceCommand(transcript)
    }
    
    recognition.onerror = (event: any) => {
      console.error('Ошибка распознавания:', event.error)
      
      let errorMessage = ''
      switch(event.error) {
        case 'not-allowed':
          errorMessage = '❌ Нет доступа к микрофону. Разрешите доступ в настройках браузера'
          break
        case 'no-speech':
          errorMessage = '🔇 Речь не обнаружена. Попробуйте ещё раз'
          break
        case 'audio-capture':
          errorMessage = '❌ Микрофон не найден. Подключите микрофон'
          break
        case 'network':
          errorMessage = '🌐 Ошибка сети. Проверьте соединение'
          break
        default:
          errorMessage = `❌ Ошибка: ${event.error}`
      }
      
      recognizedText.value = errorMessage
      setTimeout(() => { recognizedText.value = '' }, 4000)
      isListening.value = false
    }
    
    recognition.onend = () => {
      console.log('Распознавание остановлено')
      if (shouldRestart && isListening.value) {
        setTimeout(() => {
          if (isListening.value) {
            try {
              recognition.start()
            } catch (e) {
              console.error('Ошибка перезапуска:', e)
              isListening.value = false
            }
          }
        }, 100)
      } else {
        isListening.value = false
      }
    }
  } catch (error) {
    console.error('Ошибка запуска:', error)
    recognizedText.value = '❌ Ошибка запуска микрофона'
    setTimeout(() => { recognizedText.value = '' }, 3000)
    isListening.value = false
  }
}

// Остановка прослушивания
const stopListening = () => {
  shouldRestart = false
  if (recognition) {
    try {
      recognition.stop()
    } catch (e) {
      console.error('Ошибка остановки:', e)
    }
  }
  isListening.value = false
}

const toggleMicrophone = () => {
  if (isListening.value) {
    stopListening()
  } else {
    shouldRestart = true
    startListening()
  }
}

const handleAddTodo = () => {
  if (newTodoText.value.trim()) {
    addTodo(newTodoText.value)
    newTodoText.value = ''
  }
}

const handleSelectTodo = (id: number) => {
  selectTodo(id)
}

const handleCompleteTodo = (id: number) => {
  completeTodo(id)
}

const handleUncompleteTodo = (id: number) => {
  uncompleteTodo(id)
}

const handleDeleteTodo = (id: number) => {
  deleteTodo(id)
}

const formatDate = (date: Date) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } catch (error) {
    return ''
  }
}

onMounted(() => {
  checkSpeechSupport()
  recognition = initSpeechRecognition()
  
  // Скрываем подсказку через 10 секунд
  setTimeout(() => {
    voiceCommandHint.value = false
  }, 10000)
})

onUnmounted(() => {
  shouldRestart = false
  if (recognition && isListening.value) {
    try {
      recognition.stop()
    } catch (e) {
      console.error('Ошибка остановки при размонтировании:', e)
    }
  }
})
</script>

<style scoped>
/* Добавляем новые стили */
.voice-status.supported {
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.voice-status .warning {
  font-size: 0.8rem;
  color: #ff9800;
  margin-left: auto;
}

.microphone-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-hint {
  background: rgba(255, 193, 7, 0.2);
  padding: 8px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  text-align: center;
  animation: fadeIn 0.5s;
}

/* Остальные стили из предыдущей версии */
.glass-container {
  max-width: 800px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 32px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 2.5rem;
  color: white;
  margin-bottom: 12px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.stats span {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
}

.add-todo {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.glass-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 1rem;
  color: white;
  outline: none;
  transition: all 0.3s;
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

.glass-button {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.voice-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.voice-status.active {
  background: rgba(76, 175, 80, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.5);
}

.mic-icon {
  font-size: 1.3rem;
}

.microphone-toggle {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.microphone-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.recognized-text {
  background: rgba(33, 150, 243, 0.3);
  padding: 10px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: white;
  text-align: center;
  animation: fadeIn 0.3s;
}

.todo-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  flex-wrap: wrap;
  gap: 12px;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.todo-item.selected {
  background: rgba(33, 150, 243, 0.3);
  border-left: 3px solid #2196f3;
}

.todo-item.completed {
  opacity: 0.7;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-text {
  color: white;
  font-size: 1rem;
  word-break: break-word;
}

.todo-date {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
}

.todo-actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s;
}

.icon-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
}

.icon-button.complete:hover {
  background: rgba(76, 175, 80, 0.5);
}

.icon-button.uncomplete:hover {
  background: rgba(255, 152, 0, 0.5);
}

.icon-button.delete:hover {
  background: rgba(244, 67, 54, 0.5);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.7);
}

.selected-info {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.selected-info h3 {
  color: white;
  margin-bottom: 8px;
  font-size: 1rem;
}

.selected-info p {
  color: rgba(255, 255, 255, 0.9);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .glass-container {
    padding: 20px;
  }
  
  .header h1 {
    font-size: 1.8rem;
  }
  
  .add-todo {
    flex-direction: column;
  }
  
  .todo-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .todo-actions {
    justify-content: flex-end;
  }
  
  .stats {
    gap: 10px;
  }
  
  .stats span {
    font-size: 0.8rem;
  }
}

.todo-list::-webkit-scrollbar {
  width: 6px;
}

.todo-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
}
</style>