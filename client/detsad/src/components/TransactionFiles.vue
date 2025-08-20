<template>
  <div class="transaction-files">
    <div class="files-header">
      <h4>Прикрепленные файлы</h4>
      <button 
        v-if="isAdmin && !showUploadForm" 
        @click="showUploadForm = true" 
        class="btn-add-file"
      >
        + Добавить файл
      </button>
    </div>

    <!-- Форма загрузки файла -->
    <div v-if="showUploadForm" class="upload-form">
      <div class="form-group">
        <label>Выберите файл:</label>
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelect" 
          accept="image/*,.pdf,.doc,.docx"
        />
      </div>
      <div class="form-actions">
        <button @click="uploadFile" :disabled="!selectedFile || uploading" class="btn-primary">
          {{ uploading ? 'Загрузка...' : 'Загрузить' }}
        </button>
        <button @click="cancelUpload" class="btn-secondary">Отмена</button>
      </div>
    </div>

    <!-- Список файлов -->
    <div v-if="files.length > 0" class="files-list">
      <div v-for="file in files" :key="file.id" class="file-item">
        <div class="file-info">
          <span class="file-icon">{{ getFileIcon(file.mime_type) }}</span>
          <div class="file-details">
            <span class="file-name">{{ file.file_name }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
            <span class="file-date">{{ formatDate(file.created_at) }}</span>
          </div>
        </div>
        <div class="file-actions">
          <button @click="downloadFile(file)" class="btn-download">Скачать</button>
          <button 
            v-if="isAdmin" 
            @click="deleteFile(file.id)" 
            class="btn-delete"
            :disabled="deletingFileId === file.id"
          >
            {{ deletingFileId === file.id ? 'Удаление...' : 'Удалить' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="no-files">
      Нет прикрепленных файлов
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import useApi from '../composables/useApi'

const props = defineProps({
  transactionId: {
    type: Number,
    required: true
  },
  initialFiles: {
    type: Array,
    default: () => []
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['files-updated'])

const { uploadTransactionFile, deleteTransactionFile, apiUrl } = useApi()

const files = ref([...props.initialFiles])
const showUploadForm = ref(false)
const selectedFile = ref(null)
const uploading = ref(false)
const deletingFileId = ref(null)
const error = ref(null)

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0]
}

const uploadFile = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await uploadTransactionFile(props.transactionId, formData)
    
    if (response.success) {
      files.value.push(response.data)
      emit('files-updated')
      cancelUpload()
    } else {
      error.value = response.error || 'Ошибка загрузки файла'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    uploading.value = false
  }
}

const deleteFile = async (fileId) => {
  if (!confirm('Вы уверены, что хотите удалить этот файл?')) return

  deletingFileId.value = fileId
  error.value = null

  try {
    const response = await deleteTransactionFile(fileId)
    
    if (response.success) {
      files.value = files.value.filter(file => file.id !== fileId)
      emit('files-updated')
    } else {
      error.value = response.error || 'Ошибка удаления файла'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    deletingFileId.value = null
  }
}

const downloadFile = async (file) => {
  try {
    const response = await fetch(`${apiUrl}/transactions/files/${file.id}`, {
      headers: {
        'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('currentUser'))?.token}`
      }
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  } catch (err) {
    error.value = 'Ошибка скачивания файла'
  }
}

const cancelUpload = () => {
  showUploadForm.value = false
  selectedFile.value = null
  if (document.querySelector('input[type="file"]')) {
    document.querySelector('input[type="file"]').value = ''
  }
}

const getFileIcon = (mimeType) => {
  if (mimeType.includes('image')) return '🖼️'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  return '📎'
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Обновляем файлы при изменении пропса
watch(() => props.initialFiles, (newFiles) => {
  files.value = [...newFiles]
})
</script>

<style scoped>
.transaction-files {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.files-header h4 {
  margin: 0;
  color: #2c3e50;
}

.btn-add-file {
  background: #42b983;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-add-file:hover {
  background: #369c70;
}

.upload-form {
  margin-bottom: 15px;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #eee;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.file-icon {
  font-size: 1.2em;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.file-size, .file-date {
  font-size: 0.8em;
  color: #666;
}

.file-actions {
  display: flex;
  gap: 8px;
}

.btn-download, .btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
}

.btn-download {
  background: #3498db;
  color: white;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-delete:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.no-files {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.error-message {
  color: #e74c3c;
  margin-top: 10px;
  padding: 8px;
  background: #fadbd8;
  border-radius: 4px;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .file-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>