<template>
  <div class="participant-transactions-modal">
    <div class="modal-content">
      <h3 v-if="editingParticipant" class="modal-header">Редактировать участника</h3>
      <h3 v-else  class="modal-header">Добавить нового участника</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="firstName">Имя:</label>
          <input 
            id="firstName" 
            v-model="form.first_name" 
            type="text" 
            required
            minlength="2"
            maxlength="100"
          >
        </div>
        
        <div class="form-group">
          <label for="lastName">Фамилия:</label>
          <input 
            id="lastName" 
            v-model="form.last_name" 
            type="text" 
            required
            minlength="2"
            maxlength="100"
          >
        </div>
        
        <div class="form-group">
          <label for="phone">Телефон:</label>
          <input 
            id="phone" 
            v-model="form.phone" 
            type="tel"
          >
        </div>
        
        <div class="form-group" v-if="false">
          <label for="email">Email:</label>
          <input 
            id="email" 
            v-model="form.email" 
            type="email"
          >
        </div>
        
        <div class="form-group">
          <label for="childName">Имя ребенка:</label>
          <input 
            id="childName" 
            v-model="form.child_name" 
            type="text" 
            required
            minlength="2"
            maxlength="100"
          >
        </div>

        <div class="form-group checkbox-group" v-if="editingParticipant">
          <label>
            <input 
              type="checkbox" 
              v-model="form.is_excluded"
            >
            Исключить участника
          </label>
          <p class="hint">Исключенные участники не участвуют в расчетах</p>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="submit-button">
            {{ editingParticipant ? 'Обновить' : 'Добавить' }}
          </button>
          <button type="button" @click="handleCancel" class="cancel-button">
            Отмена
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import useApi from '../composables/useApi'

const props = defineProps({
  editingParticipant: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const { createParticipant, updateParticipant, loading, error } = useApi()

const form = ref({
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  child_name: '',
  is_excluded: false
})

// Перенесем функцию resetForm перед watch
const resetForm = () => {
  form.value = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    child_name: '',
    is_excluded: false
  }
}

watch(() => props.editingParticipant, (newVal) => {
  if (newVal) {
    form.value = { 
      ...newVal,
      is_excluded: (newVal.is_excluded === 1) || false
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const handleSubmit = async () => {
  try {
    // Подготовка данных для отправки
    const submitData = {
      first_name: form.value.first_name.trim(),
      last_name: form.value.last_name.trim(),
      child_name: form.value.child_name.trim(),
      phone: form.value.phone?.trim() || null,
      email: form.value.email?.trim() || null
    }

    // Добавляем is_excluded только при редактировании
    if (props.editingParticipant) {
      submitData.is_excluded = Boolean(form.value.is_excluded)
    }

    if (props.editingParticipant) {
      await updateParticipant(props.editingParticipant.id, submitData)
    } else {
      await createParticipant(submitData)
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
</script>

<style scoped>
.participant-form {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.participant-form h3 {
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

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.checkbox-group {
  margin-top: 20px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin-right: 10px;
}

.hint {
  font-size: 0.8em;
  color: #6c757d;
  margin-top: 5px;
  margin-left: 25px;
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
</style>