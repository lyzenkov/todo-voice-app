<template>
  <div class="app">
    <TodoList />
  </div>
</template>

<script setup lang="ts">
import TodoList from './components/TodoList.vue'
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>