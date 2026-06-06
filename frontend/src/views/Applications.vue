<template>
  <div class="applications">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>差旅申请列表</span>
          <el-button type="primary" @click="$router.push('/applications/create')">
            <el-icon><Plus /></el-icon>
            新建申请
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="待审批" value="PENDING_APPROVAL" />
            <el-option label="已批准" value="APPROVED" />
            <el-option label="已拒绝" value="REJECTED" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="COMPLETED" />
          </el-select>
        </el-form-item>
        <el-form-item label="目的地">
          <el-input v-model="searchForm.destination" placeholder="输入目的地" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="申请编号" width="160">
          <template #default="{ row }">
            {{ row.id?.substring(0, 8) || '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="purpose" label="出差目的" min-width="150" />
        <el-table-column prop="destination" label="目的地" width="100" />
        <el-table-column prop="departureCity" label="出发地" width="100" />
        <el-table-column label="行程" width="200">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }} ~ {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="estimatedCost" label="预估费用" width="120">
          <template #default="{ row }">
            <span class="cost">¥{{ row.estimatedCost?.toLocaleString() || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="budgetOverrunPercent" label="超支比例" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.budgetOverrunPercent > 0" type="danger">
              +{{ row.budgetOverrunPercent }}%
            </el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button
              type="primary"
              link
              size="small"
              v-if="row.status === 'DRAFT'"
              @click="submitApp(row)"
            >
              提交
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              v-if="row.status === 'APPROVED'"
              @click="goBooking(row)"
            >
              预订
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              v-if="row.status === 'IN_PROGRESS'"
              @click="goExpense(row)"
            >
              报销
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = reactive({ value: false })
const tableData = reactive<any[]>([])
const searchForm = reactive({
  status: '',
  destination: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

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

async function fetchData() {
  loading.value = true
  try {
    if (userStore.currentUser) {
      const res = await api.get(`/travel/employees/${userStore.currentUser.id}/applications`, {
        params: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          status: searchForm.status || undefined,
          destination: searchForm.destination || undefined
        }
      })
      if (res.data.success) {
        const data = res.data.data
        tableData.splice(0, tableData.length, ...(data.rows || data.data || []))
        pagination.total = data.count || data.total || tableData.length
      }
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载申请列表失败'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

function search() {
  pagination.page = 1
  fetchData()
}

function reset() {
  searchForm.status = ''
  searchForm.destination = ''
  pagination.page = 1
  fetchData()
}

function viewDetail(row: any) {
  router.push(`/applications/${row.id}`)
}

async function submitApp(row: any) {
  try {
    await ElMessageBox.confirm('确定提交此差旅申请吗？', '确认提交', {
      type: 'warning'
    })
    await api.post(`/travel/applications/${row.id}/submit`, {
      submitterId: userStore.currentUser?.id,
      approverId: userStore.currentUser?.id,
      submitterRole: userStore.currentUser?.role
    })
    ElMessage.success('提交成功')
    fetchData()
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '提交失败'
    ElMessage.error(errorMsg)
  }
}

function goBooking(row: any) {
  router.push(`/bookings/${row.id}`)
}

function goExpense(row: any) {
  router.push(`/expenses/${row.id}`)
}

onMounted(async () => {
  await userStore.initMockUser()
  fetchData()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.cost {
  color: #f56c6c;
  font-weight: 500;
}

.pagination {
  margin-top: 20px;
  justify-content: flex-end;
  display: flex;
}
</style>
