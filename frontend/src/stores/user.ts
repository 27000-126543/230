import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export interface Employee {
  id: string
  name: string
  email: string
  role: string
  departmentId: string
  travelPreference: string
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<Employee | null>(null)
  const departments = ref<any[]>([])
  const roleMap = ref<Record<string, string>>({})

  async function loadRoleMap() {
    try {
      const res = await api.get('/employees/roles')
      if (res.data.success) {
        roleMap.value = res.data.data
      } else {
        setDefaultRoleMap()
      }
    } catch (e) {
      setDefaultRoleMap()
    }
  }

  function setDefaultRoleMap() {
    roleMap.value = {
      STAFF: '普通员工',
      MANAGER: '部门经理',
      DIRECTOR: '总监',
      CFO: 'CFO',
      ADMIN: '管理员'
    }
  }

  function getRoleText(role: string): string {
    return roleMap.value[role] || role
  }

  async function initMockUser() {
    try {
      await loadRoleMap()
      const res = await api.get('/employees')
      if (res.data.success && res.data.data.length > 0) {
        currentUser.value = res.data.data[res.data.data.length - 1]
      }
    } catch (e) {
      setDefaultRoleMap()
      currentUser.value = {
        id: 'mock-employee-id',
        name: '赵六',
        email: 'zhaoliu@company.com',
        role: 'STAFF',
        departmentId: 'mock-dept-id',
        travelPreference: 'economy'
      }
    }
  }

  async function loadDepartments() {
    try {
      const res = await api.get('/departments')
      if (res.data.success) {
        departments.value = res.data.data
      }
    } catch (e) {
      departments.value = [
        { id: 'dept1', name: '技术研发部' },
        { id: 'dept2', name: '市场营销部' },
        { id: 'dept3', name: '财务部' }
      ]
    }
  }

  const roleText = computed(() => {
    if (!currentUser.value?.role) return '员工'
    return getRoleText(currentUser.value.role)
  })

  return {
    currentUser,
    departments,
    roleMap,
    initMockUser,
    loadDepartments,
    loadRoleMap,
    getRoleText,
    roleText
  }
})
