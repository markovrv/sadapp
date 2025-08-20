<template>
  <div v-if="showModal" class="auth-modal">
    <div class="modal-content">
      <h2>Авторизация</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="loginUsername">Логин:</label>
          <input 
            type="text" 
            id="loginUsername" 
            v-model="username" 
            placeholder="admin или номер телефона"
            required
          >
        </div>
        <div class="form-group">
          <label for="loginPassword">Пароль:</label>
          <input 
            type="password" 
            id="loginPassword" 
            v-model="password" 
            placeholder="Пароль администратора или имя ребенка"
            required
          >
        </div>
        <button type="submit" class="btn btn-success">Войти</button>
      </form>
      <div class="auth-info">
        <p><strong>Для администратора:</strong> Логин и пароль</p>
        <p><strong>Для родителей:</strong> Номер телефона как логин, имя ребенка как пароль</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login'])

const showModal = ref(true)
const username = ref('')
const password = ref('')

const handleLogin = () => {
  emit('login', {
    login: username.value,
    password: password.value
  })
}
</script>

<style scoped>
.auth-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 400px;
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0,0,0,0.2);
}

.modal-content h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.btn {
  background: #3498db;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
  width: 100%;
}

.btn:hover {
  background: #2980b9;
}

.btn-success {
  background: #27ae60;
}

.btn-success:hover {
  background: #229954;
}

.auth-info {
  margin-top: 20px;
  font-size: 0.9em;
  color: #666;
}

.auth-info p {
  margin-bottom: 10px;
}
</style>