<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Учет платежей детского сада</h1>
      <div v-if="currentUser" class="user-info">
        {{ userRoleText }} ({{ currentUser.login }})
        <button @click="handleLogout" class="logout-btn">Выйти</button>
      </div>
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
      <AuthModal 
        v-if="!currentUser" 
        @login="handleLogin"
      />
      
      <div v-if="loading" class="loading-spinner">Загрузка...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      
      <template v-else>
        <ParticipantsSection 
          v-if="activeTab === 'participants' && currentUser" 
          :is-admin="currentUser.role === 'admin'"
        />
        <TransactionsSection 
          v-if="activeTab === 'transactions' && currentUser" 
          :is-admin="currentUser.role === 'admin'"
        />
        <StatisticsSection 
          v-if="activeTab === 'statistics' && currentUser" 
          :is-admin="currentUser.role === 'admin'"
        />
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ParticipantsSection from './components/ParticipantList.vue'
import TransactionsSection from './components/TransactionList.vue'
import StatisticsSection from './components/StatisticsCard.vue'
import AuthModal from './components/AuthModal.vue'
import useApi from './composables/useApi'

const { apiUrl } = useApi()

const tabs = [
  { id: 'participants', label: 'Участники' },
  { id: 'transactions', label: 'Транзакции' },
  { id: 'statistics', label: 'Статистика' }
]

const activeTab = ref('participants')
const loading = ref(false)
const error = ref(null)
const currentUser = ref(null)

const userRoleText = computed(() => {
  return currentUser.value?.role === 'admin' ? 'Администратор' : 'Родитель'
})

onMounted(() => {
  // Проверяем авторизацию при загрузке
  const savedUser = localStorage.getItem('currentUser')
  if (savedUser) {
    currentUser.value = JSON.parse(savedUser)
  }
})

const handleLogin = async (credentials) => {
  try {
    loading.value = true
    const response = await fetch(apiUrl + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })

    const data = await response.json()

    if (data.success) {
      currentUser.value = {
        login: credentials.login,
        role: data.role,
        token: data.token
      }
      localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
    } else {
      error.value = 'Ошибка авторизации: ' + (data.error || 'Неверные учетные данные')
    }
  } catch (err) {
    error.value = 'Ошибка соединения: ' + err.message
  } finally {
    loading.value = false
  }
}

const handleLogout = () => {
  currentUser.value = null
  localStorage.removeItem('currentUser')
}
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
  position: relative;
}

.app-header h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.user-info {
  position: absolute;
  top: -35px;
  right: -10px;
  background: #f8f9fa;
  padding: 8px 15px;
  border-radius: 5px;
  font-size: 0.9em;
}

.logout-btn {
  margin-left: 10px;
  background: #dc3545;
  color: white;
  border: none;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
}

.logout-btn:hover {
  background: #c82333;
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
  position: relative;
  min-height: 300px;
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
  .user-info {
    position: static;
    margin-bottom: 15px;
  }
}
</style>