<template>
  <div class="transactions-section">
    <div class="section-header">
      <h2>Транзакции</h2>
      <div class="transaction-buttons">
        <button @click="showContributionForm = true" class="contribution-button">
          + Взнос
        </button>
        <button @click="showExpenseForm = true" class="expense-button">
          - Расход
        </button>
      </div>
    </div>

    <TransactionForm 
      v-if="showContributionForm" 
      type="contribution"
      @submit="handleSubmit"
      @cancel="showContributionForm = false"
    />

    <TransactionForm 
      v-if="showExpenseForm" 
      type="expense"
      @submit="handleSubmit"
      @cancel="showExpenseForm = false"
    />

    <div class="transactions-list">
      <TransactionItem 
        v-for="transaction in transactions" 
        :key="transaction.id" 
        :transaction="transaction"
        :participants="participants"
        @updated="fetchData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TransactionForm from './TransactionForm.vue'
import useApi from '../composables/useApi'
import TransactionItem from './TransactionItem.vue'

const { 
  getTransactions, 
  getParticipants,
  createContribution,
  createExpense,
  loading,
  error 
} = useApi()

const transactions = ref([])
const participants = ref([])
const showContributionForm = ref(false)
const showExpenseForm = ref(false)

const fetchData = async () => {
  try {
    const [transactionsData, participantsData] = await Promise.all([
      getTransactions(),
      getParticipants()
    ])
    transactions.value = transactionsData.data
    participants.value = participantsData.data
  } catch (err) {
    console.error(err)
  }
}

const getParticipantName = (id) => {
  const participant = participants.value.find(p => p.id === id)
  return participant ? `${participant.last_name} ${participant.first_name}` : 'Неизвестно'
}

const handleSubmit = async () => {
  await fetchData()
  showContributionForm.value = false
  showExpenseForm.value = false
}

onMounted(fetchData)
</script>

<style scoped>
.transactions-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.transaction-buttons {
  display: flex;
  gap: 10px;
}

.transaction-buttons button {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: white;
  font-weight: bold;
}

.contribution-button {
  background: #27ae60;
}

.expense-button {
  background: #e74c3c;
}

.transactions-list {
  display: grid;
  gap: 15px;
}

.transaction-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.transaction-info h3 {
  margin-top: 0;
  color: #2c3e50;
}

.positive {
  color: #27ae60;
}

.negative {
  color: #e74c3c;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
  }
}
</style>