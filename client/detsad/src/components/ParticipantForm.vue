<template>
  <div class="participant-form">
    <h3 v-if="editingParticipant">Редактировать участника</h3>
    <h3 v-else>Добавить нового участника</h3>
    
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
  child_name: ''
})

// Перенесем функцию resetForm перед watch
const resetForm = () => {
  form.value = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    child_name: ''
  }
}

watch(() => props.editingParticipant, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }
  } else {
    resetForm()
  }
}, { immediate: true })

const handleSubmit = async () => {
  try {
    if (props.editingParticipant) {
      await updateParticipant(props.editingParticipant.id, form.value)
    } else {
      await createParticipant(form.value)
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