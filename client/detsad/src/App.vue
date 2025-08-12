<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Учет платежей детского сада</h1>
      <nav class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id" 
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <main class="app-content">
      <div v-if="loading" class="loading-spinner">Загрузка...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      
      <template v-else>
        <ParticipantsSection v-if="activeTab === 'participants'" />
        <TransactionsSection v-if="activeTab === 'transactions'" />
        <StatisticsSection v-if="activeTab === 'statistics'" />
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ParticipantsSection from './components/ParticipantList.vue'
import TransactionsSection from './components/TransactionList.vue'
import StatisticsSection from './components/StatisticsCard.vue'

const tabs = [
  { id: 'participants', label: 'Участники' },
  { id: 'transactions', label: 'Транзакции' },
  { id: 'statistics', label: 'Статистика' }
]

const activeTab = ref('participants')
const loading = ref(false)
const error = ref(null)
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  margin-bottom: 30px;
  text-align: center;
}

.app-header h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.tabs button.active {
  background: #42b983;
  color: white;
}

.app-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.loading-spinner,
.error-message {
  text-align: center;
  padding: 20px;
}

.error-message {
  color: #e74c3c;
}

@media (max-width: 768px) {
  .tabs {
    flex-direction: column;
  }
  .app-container {
    padding: 0;
  }
}
</style>