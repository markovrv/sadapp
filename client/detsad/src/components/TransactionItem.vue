<template>
  <div class="transaction-item" :class="{ canceled: transaction.status === 'cancelled' }">
    <div class="transaction-main">
      <div class="transaction-info">
        <template v-if="!isEditing">
          <p><strong>{{ transaction.description }}</strong></p>
          <p>Дата: {{ formatDate(transaction.created_at) }}</p>
          <p v-if="transaction.first_name || transaction.last_name || transaction.child_name"><i>{{ transaction.first_name }} {{ transaction.last_name }} за {{ childName }}</i></p>
          <p :class="amountClass">{{ minus }}{{ (transaction.participant_amount)?transaction.participant_amount:transaction.amount }} ₽</p>
          <p v-if="transaction.status === 'cancelled'" class="status-label">Отменена</p>
        </template>
        <template v-else>
          <div class="edit-form">
            <div class="form-group">
              <label>Описание:</label>
              <input v-model="editForm.description" type="text" required minlength="3" maxlength="500">
            </div>
            <div class="form-group">
              <label>Сумма:</label>
              <input v-model.number="editForm.amount" type="number" step="0.01" min="0.01" required>
            </div>
          </div>
        </template>
      </div>
      <div class="transaction-actions" v-if="showActions">
        <template v-if="transaction.status === 'cancelled'">
          <button @click="toggleEdit" class="action-btn edit">
            {{ isEditing ? 'Отменить' : 'Изменить' }}
          </button>
          <button v-if="!isEditing" @click="reapplyTransaction" class="action-btn reapply">
            Провести
          </button>
          <button v-if="isEditing" @click="saveTransaction" class="action-btn save">
            Сохранить
          </button>
        </template>
        <template v-else>
          <button @click="cancelTransaction" class="action-btn cancel" v-if="canBeCanceled">
            Отменить
          </button>
          <button @click="deleteTransaction" class="action-btn delete" v-if="canBeDeleted">
            Удалить
          </button>
        </template>
        <button v-if="!canBeDeleted && !isEditing" @click="toggleDistribution" class="action-btn info">
          {{ showDistributionDetails ? 'Скрыть' : 'Детали' }}
        </button>
      </div>
    </div>
    
    <div v-if="showDistributionDetails" class="distribution-details">
      <h4>Распределение:</h4>
      <div v-if="distributionLoading" class="loading">Загрузка...</div>
      <div v-else-if="distributionError" class="error">{{ distributionError }}</div>
      <div v-else>
        <div v-for="item in distribution.data" :key="item.participant_id" class="distribution-item">
          {{ getParticipantName(item.participant_id) }}: {{ item.amount }} ₽
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import useApi from '../composables/useApi'

import petrovich  from 'petrovich';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  },
  participants: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['updated'])

const { 
  cancelTransaction: cancelTransactionApi,
  reapplyTransaction: reapplyTransactionApi,
  deleteTransaction: deleteTransactionApi,
  updateTransaction,
  getTransactionDistribution,
  loading: apiLoading,
  error: apiError
} = useApi()

const isEditing = ref(false)
const editForm = ref({
  description: '',
  amount: 0
})
const showDistributionDetails = ref(false)
const distribution = ref([])
const distributionLoading = ref(false)
const distributionError = ref(null)

const amountClass = computed(() => ({
  positive: props.transaction.type === 'contribution',
  negative: props.transaction.type === 'expense'
}))

const childName = computed(() => {
  const lastChar = props.transaction.child_name.slice(-1).toLowerCase()
  if (lastChar === 'а' || lastChar === 'я')
    return petrovich.female.first.accusative(props.transaction.child_name)
  return petrovich.male.first.accusative(props.transaction.child_name)
})

const showActions = computed(() => {
  return ['contribution', 'expense'].includes(props.transaction.type)
})

const canBeCanceled = computed(() => {
  return props.transaction.status !== 'cancelled' && 
         props.transaction.type !== 'distribution'
})

const canBeDeleted = computed(() => {
  return props.transaction.type === 'contribution' && 
         props.transaction.status !== 'cancelled'
})

const minus = computed(() => {
  if (props.transaction.type === 'expense') {
    return '-'
  } else return ''
})

const toggleEdit = () => {
  if (isEditing.value) {
    // Отмена редактирования
    isEditing.value = false
  } else {
    // Начало редактирования
    editForm.value = {
      description: props.transaction.description,
      amount: Math.abs(parseFloat(props.transaction.amount))
    }
    isEditing.value = true
  }
}

const saveTransaction = async () => {
  if (!editForm.value.description || editForm.value.description.length < 3) {
    alert('Описание должно содержать минимум 3 символа')
    return
  }
  
  if (!editForm.value.amount || editForm.value.amount <= 0) {
    alert('Сумма должна быть больше 0')
    return
  }

  if (confirm('Сохранить изменения транзакции?')) {
    try {
      await updateTransaction(props.transaction.id, {
        description: editForm.value.description,
        amount: Math.abs(editForm.value.amount)
      })
      isEditing.value = false
      emit('updated')
    } catch (error) {
      console.error('Ошибка обновления транзакции:', error)
      alert('Не удалось обновить транзакцию')
    }
  }
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

const getParticipantName = (id) => {
  const participant = props.participants.find(p => p.id === id)
  return participant ? `${participant.last_name} ${participant.first_name}` : 'Неизвестно'
}

const cancelTransaction = async () => {
  if (confirm('Вы уверены, что хотите отменить эту транзакцию? Средства будут возвращены.')) {
    try {
      await cancelTransactionApi(props.transaction.id)
      emit('updated')
    } catch (error) {
      console.error('Ошибка отмены транзакции:', error)
    }
  }
}

const reapplyTransaction = async () => {
  if (confirm('Вы уверены, что хотите перепровести эту транзакцию?')) {
    try {
      await reapplyTransactionApi(props.transaction.id)
      emit('updated')
    } catch (error) {
      console.error('Ошибка перепроведения транзакции:', error)
    }
  }
}

const deleteTransaction = async () => {
  if (confirm('Вы уверены, что хотите удалить эту транзакцию? Это действие нельзя отменить.')) {
    try {
      await deleteTransactionApi(props.transaction.id)
      emit('updated')
    } catch (error) {
      console.error('Ошибка удаления транзакции:', error)
    }
  }
}

const toggleDistribution = async () => {
  showDistributionDetails.value = !showDistributionDetails.value
  if (showDistributionDetails.value && distribution.value.length === 0) {
    await loadDistribution()
  }
}

const loadDistribution = async () => {
  distributionLoading.value = true
  distributionError.value = null
  try {
    distribution.value = await getTransactionDistribution(props.transaction.id)
  } catch (error) {
    distributionError.value = error.message
  } finally {
    distributionLoading.value = false
  }
}
</script>

<style scoped>
.transaction-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background: white;
  transition: all 0.3s ease;
}

.transaction-item.canceled {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  color: #6c757d;
}

.transaction-item.canceled .transaction-info strong {
  color: #6c757d;
}

.transaction-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.transaction-info {
  flex: 1;
}

.positive {
  color: #28a745;
  font-weight: bold;
}

.negative {
  color: #dc3545;
  font-weight: bold;
}

.status-label {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  font-size: 0.8em;
  margin-top: 5px;
}

.transaction-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  white-space: nowrap;
  transition: all 0.2s;
}

.action-btn.cancel {
  background-color: #ffc107;
  color: #212529;
}

.action-btn.cancel:hover {
  background-color: #e0a800;
}

.action-btn.reapply {
  background-color: #20c997;
  color: white;
}

.action-btn.reapply:hover {
  background-color: #17a2b8;
}

.action-btn.delete {
  background-color: #dc3545;
  color: white;
}

.action-btn.delete:hover {
  background-color: #c82333;
}

.action-btn.info {
  background-color: #17a2b8;
  color: white;
}

.action-btn.info:hover {
  background-color: #138496;
}

.distribution-details {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #dee2e6;
}

.distribution-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
}

.loading, .error {
  padding: 10px;
  text-align: center;
  font-size: 0.9em;
}

.error {
  color: #dc3545;
}

/* Добавляем новые стили для формы редактирования */
.edit-form {
  display: grid;
  gap: 10px;
}

.form-group {
  display: grid;
  gap: 5px;
}

.form-group label {
  font-size: 0.9em;
  font-weight: 500;
}

.form-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
}

/* Добавляем стили для новых кнопок */
.action-btn.edit {
  background-color: #6c757d;
  color: white;
}

.action-btn.edit:hover {
  background-color: #5a6268;
}

.action-btn.save {
  background-color: #28a745;
  color: white;
}

.action-btn.save:hover {
  background-color: #218838;
}

@media (max-width: 768px) {
  .transaction-main {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .transaction-actions {
    margin-top: 10px;
    width: 100%;
    flex-direction: column;
  }
}
</style>