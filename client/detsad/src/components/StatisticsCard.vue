<template>
  <div class="statistics-section">
    <h2>Статистика системы</h2>

    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="stats-grid">
      <div class="stat-card total-balance">
        <h3>Общий баланс</h3>
        <p class="stat-value">{{ statistics.group_balance }} ₽</p>
      </div>
      
      <div class="stat-card total-contributions">
        <h3>Всего взносов</h3>
        <p class="stat-value">{{ statistics.total_contributed }} ₽</p>
      </div>
      
      <div class="stat-card total-expenses">
        <h3>Всего расходов</h3>
        <p class="stat-value">{{ statistics.total_spent }} ₽</p>
      </div>
      
      <div class="stat-card participants-count">
        <h3>Количество участников</h3>
        <p class="stat-value">{{ statistics.total_participants }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import useApi from '../composables/useApi'

const { getStatistics, loading, error } = useApi()

const statistics = ref({
  total_balance: 0,
  total_contributions: 0,
  total_expenses: 0,
  participants_count: 0
})

const fetchStatistics = async () => {
  try {
    const data = await getStatistics()
    statistics.value = data.data
  } catch (err) {
    console.error(err)
  }
}

onMounted(fetchStatistics)
</script>

<style scoped>
.statistics-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h3 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.stat-value {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 0;
}

.total-balance {
  border-top: 4px solid #3498db;
}

.total-contributions {
  border-top: 4px solid #2ecc71;
}

.total-expenses {
  border-top: 4px solid #e74c3c;
}

.participants-count {
  border-top: 4px solid #9b59b6;
}

.loading, .error {
  text-align: center;
  padding: 20px;
}

.error {
  color: #e74c3c;
}
</style>