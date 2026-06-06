<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blue">
              <el-icon :size="32"><Tickets /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.myApplications }}</div>
              <div class="stat-label">我的申请</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon orange">
              <el-icon :size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingApproval }}</div>
              <div class="stat-label">待我审批</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon green">
              <el-icon :size="32"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ stats.totalExpense.toLocaleString() }}</div>
              <div class="stat-label">本月费用</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon purple">
              <el-icon :size="32"><Wallet /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ stats.budgetLeft.toLocaleString() }}</div>
              <div class="stat-label">预算余额</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>我的申请进度</span>
              <el-button type="primary" size="small" @click="$router.push('/applications/create')">
                <el-icon><Plus /></el-icon>
                新建申请
              </el-button>
            </div>
          </template>
          <el-table :data="recentApplications" style="width: 100%">
            <el-table-column prop="destination" label="目的地" width="100" />
            <el-table-column prop="startDate" label="开始日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.startDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="estimatedCost" label="预估费用" width="100">
              <template #default="{ row }">
                ¥{{ row.estimatedCost }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>待办提醒</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in todos"
              :key="index"
              :timestamp="item.time"
              :type="item.type"
            >
              {{ item.content }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'
import api from '@/api'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

const loading = ref(false)
const stats = reactive({
  myApplications: 0,
  pendingApproval: 0,
  totalExpense: 0,
  budgetLeft: 0
})

const recentApplications = reactive<any[]>([])
const todos = reactive<any[]>([])

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function statusType(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'info',
    PENDING_APPROVAL: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success'
  }
  return map[status] || 'info'
}

function statusText(status: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PENDING_APPROVAL: '待审批',
    APPROVED: '已批准',
    REJECTED: '已拒绝',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完成'
  }
  return map[status] || status
}

async function fetchDashboardData() {
  if (!userStore.currentUser) return
  
  loading.value = true
  try {
    const [statsRes, appsRes, todosRes] = await Promise.all([
      api.get('/dashboard/stats', {
        params: {
          employeeId: userStore.currentUser.id,
          departmentId: userStore.currentUser.departmentId
        }
      }),
      api.get('/dashboard/recent-applications', {
        params: {
          employeeId: userStore.currentUser.id,
          limit: 5
        }
      }),
      api.get('/dashboard/todos', {
        params: {
          employeeId: userStore.currentUser.id,
          limit: 10
        }
      })
    ])

    if (statsRes.data.success) {
      Object.assign(stats, statsRes.data.data)
    }

    if (appsRes.data.success) {
      recentApplications.splice(0, recentApplications.length, ...appsRes.data.data)
    }

    if (todosRes.data.success) {
      todos.splice(0, todos.length, ...todosRes.data.data)
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载工作台数据失败'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  await userStore.loadDepartments()
  await fetchDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.blue { background: linear-gradient(135deg, #409EFF, #66b1ff); }
.stat-icon.orange { background: linear-gradient(135deg, #E6A23C, #ebb563); }
.stat-icon.green { background: linear-gradient(135deg, #67C23A, #85ce61); }
.stat-icon.purple { background: linear-gradient(135deg, #909399, #a6a9ad); }

.stat-info .stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-info .stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.content-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
