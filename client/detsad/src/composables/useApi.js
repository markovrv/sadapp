import { ref } from 'vue'

export default function useApi() {
    // const apiUrl = 'https://detsad.markovrv.ru/api'
    const apiUrl = 'http://localhost:3000/api'
    const loading = ref(false)
    const error = ref(null)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'))

    const getAuthHeaders = () => {
        if (currentUser && currentUser.token) {
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
        return {
            'Content-Type': 'application/json'
        }
    }

    const fetchData = async (endpoint, options = {}) => {
        loading.value = true
        error.value = null

        try {
            const response = await fetch(`${apiUrl}${endpoint}`, {
                headers: getAuthHeaders(),
                ...options
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Требуется авторизация')
                }
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (err) {
            error.value = err.message
            console.error('API Error:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    // Participants API
    const getParticipants = async () => fetchData('/participants')
    const getParticipant = async (id) => fetchData(`/participants/${id}`)
    const createParticipant = async (data) => fetchData('/participants', {
        method: 'POST',
        body: JSON.stringify(data)
    })
    const updateParticipant = async (id, data) => fetchData(`/participants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })
    const deleteParticipant = async (id) => fetchData(`/participants/${id}`, {
        method: 'DELETE'
    })
    const getParticipantBalance = async (id) => fetchData(`/participants/${id}/balance`)
    const getParticipantTransactions = async (id) => fetchData(`/transactions/participant/${id}`)


    // Transactions API
    const getTransactions = async (limit = 50, offset = 0) =>
        fetchData(`/transactions?limit=${limit}&offset=${offset}`)
    const createContribution = async (data) => fetchData('/transactions/contribution', {
        method: 'POST',
        body: JSON.stringify(data)
    })
    const createExpense = async (data) => fetchData('/transactions/expense', {
        method: 'POST',
        body: JSON.stringify(data)
    })
    const getStatistics = async () => fetchData('/transactions/statistics')

    const cancelTransaction = async (id) => fetchData(`/transactions/${id}/cancel`, {
        method: 'POST'
    })

    const reapplyTransaction = async (id) => fetchData(`/transactions/${id}/reapply`, {
        method: 'POST'
    })

    const deleteTransaction = async (id) => fetchData(`/transactions/${id}`, {
        method: 'DELETE'
    })

    const getTransactionDistribution = async (id) => fetchData(`/transactions/${id}/distribution`)

    const updateTransaction = async (id, data) => fetchData(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })

    return {
        apiUrl,
        loading,
        error,
        getParticipants,
        getParticipant,
        createParticipant,
        updateParticipant,
        deleteParticipant,
        getParticipantBalance,
        getParticipantTransactions,
        getTransactions,
        createContribution,
        createExpense,
        getStatistics,
        cancelTransaction,
        reapplyTransaction,
        deleteTransaction,
        getTransactionDistribution,
        updateTransaction
    }
}