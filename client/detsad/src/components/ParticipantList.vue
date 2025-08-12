<template>
  <div class="participants-section">
    <div class="section-header">
      <h2>Участники группы</h2>
      <button @click="showForm = true" class="add-button">
        + Добавить участника
      </button>
    </div>

    <ParticipantForm v-if="showForm" :editingParticipant="editingParticipant" @submit="handleSubmit"
      @cancel="showForm = false" />

    <div class="participants-list">
      <div v-for="participant in participants" :key="participant.id" class="participant-card">
        <div class="participant-info">
          <h3>{{ participant.last_name }} {{ participant.first_name }}</h3>
          <p>Ребенок: {{ participant.child_name }}</p>
          <p v-if="participant.phone">Телефон: {{ participant.phone }}</p>
          <p v-if="participant.email">Email: {{ participant.email }}</p>
          <p>Баланс: {{ participant.account_balance || 0 }} ₽</p>
        </div>
        <div class="participant-actions">
          <button @click="editParticipant(participant)" class="edit-button">Редактировать</button>
          <button @click="deleteParticipant(participant.id)" class="delete-button">Удалить</button>
          <button @click="viewTransactions(participant.id)" class="transactions-button">Транзакции</button>
        </div>
      </div>
    </div>

    <div v-if="viewingTransactionsFor" class="participant-transactions-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Транзакции участника: {{ getParticipantName(viewingTransactionsFor) }}</h3>
          <button @click="closeTransactionsModal" class="close-button">&times;</button>
        </div>

        <div v-if="transactionsLoading" class="loading">Загрузка...</div>
        <div v-else-if="transactionsError" class="error">{{ transactionsError }}</div>

        <div v-else class="transactions-list">
          <TransactionItem v-for="transaction in participantTransactions.data" :key="transaction.id"
            :transaction="transaction" :participants="participants"
            @updated="viewTransactions(viewingTransactionsFor)" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ParticipantForm from './ParticipantForm.vue'
import useApi from '../composables/useApi'
import TransactionItem from './TransactionItem.vue'

const {
  getParticipants,
  deleteParticipant: deleteParticipantApi,
  getParticipantBalance,
  getParticipantTransactions,
  loading,
  error
} = useApi()

const participants = ref([])
const showForm = ref(false)
const editingParticipant = ref(null)

const viewingTransactionsFor = ref(null)
const participantTransactions = ref([])
const transactionsLoading = ref(false)
const transactionsError = ref(null)

const fetchParticipants = async () => {
  try {
    const data = await getParticipants()
    // Добавляем баланс к каждому участнику
    participants.value = await Promise.all(data.data.map(async participant => {
      const balanceData = await getParticipantBalance(participant.id)
      return { ...participant, balance: balanceData.balance }
    }))
  } catch (err) {
    console.error(err)
  }
}

const deleteParticipant = async (id) => {
  if (confirm('Вы уверены, что хотите удалить этого участника?')) {
    await deleteParticipantApi(id)
    await fetchParticipants()
  }
}

const editParticipant = (participant) => {
  editingParticipant.value = participant
  showForm.value = true
}

const handleSubmit = async () => {
  await fetchParticipants()
  showForm.value = false
  editingParticipant.value = null
}

const viewTransactions = async (id) => {
  viewingTransactionsFor.value = id
  transactionsLoading.value = true
  transactionsError.value = null

  try {
    participantTransactions.value = await getParticipantTransactions(id)
  } catch (err) {
    transactionsError.value = err.message
    console.error('Ошибка загрузки транзакций:', err)
  } finally {
    transactionsLoading.value = false
  }
}

const closeTransactionsModal = () => {
  viewingTransactionsFor.value = null
  participantTransactions.value = []
}

const getParticipantName = (id) => {
  const participant = participants.value.find(p => p.id === id)
  return participant ? `${participant.last_name} ${participant.first_name}` : 'Неизвестно'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(fetchParticipants)
</script>

<style scoped>
.participants-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-button {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
}

.add-button:hover {
  background: #369f6b;
}

.participants-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.participant-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  transition: box-shadow 0.3s;
}

.participant-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.participant-info h3 {
  margin-top: 0;
  color: #2c3e50;
}

.participant-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.participant-actions button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.edit-button {
  background: #3498db;
  color: white;
}

.delete-button {
  background: #e74c3c;
  color: white;
}

.transactions-button {
  background: #9b59b6;
  color: white;
}

.participant-transactions-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #777;
}

.transactions-list {
  display: grid;
  gap: 15px;
}

.transaction-item {
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #f9f9f9;
}

.positive {
  color: #27ae60;
  font-weight: bold;
}

.negative {
  color: #e74c3c;
  font-weight: bold;
}

.no-transactions {
  text-align: center;
  padding: 20px;
  color: #777;
}

.loading,
.error {
  text-align: center;
  padding: 20px;
}

.error {
  color: #e74c3c;
}

@media (max-width: 768px) {
  .section-header, .participant-actions {
    flex-direction: column;
  }
  .participants-list {
    grid-template-columns: auto;
  }
}
</style>