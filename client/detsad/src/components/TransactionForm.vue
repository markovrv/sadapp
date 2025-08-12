<template>
  <div class="transaction-form">
    <h3 v-if="type === 'contribution'">Добавить взнос</h3>
    <h3 v-else>Добавить расход</h3>
    
    <form @submit.prevent="handleSubmit">
      <div v-if="type === 'contribution'" class="form-group">
        <label for="participant">Участник:</label>
        <select 
          id="participant" 
          v-model="form.participant_id" 
          required
        >
          <option 
            v-for="participant in participants.data" 
            :key="participant.id" 
            :value="participant.id"
          >
            {{ participant.last_name }} {{ participant.first_name }} ({{ participant.child_name }})
          </option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="amount">Сумма (₽):</label>
        <input 
          id="amount" 
          v-model.number="form.amount" 
          type="number" 
          step="0.01"
          min="0.01"
          required
        >
      </div>
      
      <div class="form-group">
        <label for="description">Описание:</label>
        <textarea 
          id="description" 
          v-model="form.description" 
          required
          minlength="3"
          maxlength="500"
        ></textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="submit-button">
          Сохранить
        </button>
        <button type="button" @click="handleCancel" class="cancel-button">
          Отмена
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import useApi from '../composables/useApi'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['contribution', 'expense'].includes(value)
  }
})

const emit = defineEmits(['submit', 'cancel'])

const { getParticipants, createContribution, createExpense, loading, error } = useApi()

const participants = ref([])
const form = ref({
  participant_id: null,
  amount: null,
  description: ''
})

const fetchParticipants = async () => {
  try {
    participants.value = await getParticipants()
    if (participants.value.length > 0) {
      form.value.participant_id = participants.value[0].id
    }
  } catch (err) {
    console.error(err)
  }
}

const handleSubmit = async () => {
  try {
    if (props.type === 'contribution') {
      await createContribution(form.value)
    } else {
      await createExpense(form.value)
    }
    emit('submit')
    resetForm()
  } catch (err) {
    console.error(err)
  }
}

const handleCancel = () => {
  resetForm()
  emit('cancel')
}

const resetForm = () => {
  form.value = {
    participant_id: participants.value.length > 0 ? participants.value[0].id : null,
    amount: null,
    description: ''
  }
}

onMounted(fetchParticipants)
</script>

<style scoped>
.transaction-form {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.transaction-form h3 {
  margin-top: 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.form-group textarea {
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-button {
  background: #42b983;
  color: white;
}

.cancel-button {
  background: #f0f0f0;
  color: #333;
}
</style>