<template>
  <div class="logs">
    <el-card class="mb-20">
      <template #header>
        <span>操作日志</span>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.operationType" placeholder="全部" clearable style="width: 140px">
            <el-option label="创建" value="CREATE" />
            <el-option label="更新" value="UPDATE" />
            <el-option label="删除" value="DELETE" />
            <el-option label="审批" value="APPROVE" />
            <el-option label="预订" value="BOOKING" />
            <el-option label="报销" value="EXPENSE" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="searchForm.level" placeholder="全部" clearable style="width: 120px">
            <el-option label="信息" value="INFO" />
            <el-option label="警告" value="WARNING" />
            <el-option label="错误" value="ERROR" />
            <el-option label="严重" value="CRITICAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
          />
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
        <el-table-column prop="id" label="日志ID" width="140">
          <template #default="{ row }">
            {{ row.id?.substring(0, 10) || '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="operationType" label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.operationType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resourceType" label="资源类型" width="120" />
        <el-table-column prop="resourceId" label="资源ID" width="120">
          <template #default="{ row }">
            {{ row.resourceId?.substring(0, 8) || '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="100" />
        <el-table-column prop="ip" label="IP地址" width="130" />
        <el-table-column prop="level" label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="details" label="详情" min-width="200">
          <template #default="{ row }">
            <span class="details-text">{{ row.details }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>异常预警</span>
          <el-badge :value="pendingAlertCount" class="item" type="danger">
            <el-button size="small">待处理</el-button>
          </el-badge>
        </div>
      </template>

      <el-table :data="alertList" style="width: 100%">
        <el-table-column prop="alertType" label="预警类型" width="130">
          <template #default="{ row }">
            <el-tag :type="alertTypeColor(row.alertType)" size="small">
              {{ alertTypeText(row.alertType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="severityColor(row.severity)" size="small">
              {{ severityText(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" width="200" />
        <el-table-column prop="message" label="内容" min-width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PENDING' ? 'warning' : row.status === 'ACKNOWLEDGED' ? 'primary' : 'success'" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="触发时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'PENDING'"
              type="primary"
              link
              size="small"
              @click="acknowledge(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status === 'ACKNOWLEDGED'"
              type="success"
              link
              size="small"
              @click="resolve(row)"
            >
              解决
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const userStore = useUserStore()
const loading = reactive({ value: false })
const tableData = reactive<any[]>([])
const alertList = reactive<any[]>([])
const searchForm = reactive({
  operationType: '',
  level: '',
  dateRange: [] as string[]
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const pendingAlertCount = computed(() => alertList.filter(a => a.status === 'PENDING').length)

function formatDateTime(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

function levelType(level: string) {
  const map: Record<string, string> = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'danger',
    CRITICAL: 'danger'
  }
  return map[level] || 'info'
}

function alertTypeText(type: string) {
  const map: Record<string, string> = {
    BUDGET_OVERRUN: '预算超支',
    ANOMALY_EXPENSE: '异常费用',
    APPROVAL_TIMEOUT: '审批超时',
    BOOKING_FAILED: '预订失败',
    SYSTEM_ERROR: '系统错误',
    OCR_FAILED: 'OCR失败'
  }
  return map[type] || type
}

function alertTypeColor(type: string) {
  const map: Record<string, string> = {
    BUDGET_OVERRUN: 'danger',
    ANOMALY_EXPENSE: 'warning',
    APPROVAL_TIMEOUT: 'warning',
    BOOKING_FAILED: 'danger',
    SYSTEM_ERROR: 'danger',
    OCR_FAILED: 'warning'
  }
  return map[type] || 'info'
}

function severityText(severity: string) {
  const map: Record<string, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    CRITICAL: '严重'
  }
  return map[severity] || severity
}

function severityColor(severity: string) {
  const map: Record<string, string> = {
    LOW: 'info',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger'
  }
  return map[severity] || 'info'
}

function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING: '待处理',
    ACKNOWLEDGED: '已确认',
    RESOLVED: '已解决',
    IGNORED: '已忽略'
  }
  return map[status] || status
}

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get('/logs', {
      params: {
        operationType: searchForm.operationType || undefined,
        level: searchForm.level || undefined,
        startDate: searchForm.dateRange?.[0],
        endDate: searchForm.dateRange?.[1],
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    })
    if (res.data.success) {
      const data = res.data.data
      tableData.splice(0, tableData.length, ...(data.rows || data.data || []))
      pagination.total = data.count || data.total || tableData.length
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载日志失败'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

async function fetchAlerts() {
  try {
    const res = await api.get('/alerts/pending')
    if (res.data.success) {
      alertList.splice(0, alertList.length, ...(res.data.data || []))
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载预警失败'
    ElMessage.error(errorMsg)
  }
}

function search() {
  pagination.page = 1
  fetchData()
}

function reset() {
  searchForm.operationType = ''
  searchForm.level = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchData()
}

async function acknowledge(row: any) {
  try {
    await api.post(`/alerts/${row.id}/acknowledge`, { operatorId: userStore.currentUser?.id })
    ElMessage.success('已确认')
    row.status = 'ACKNOWLEDGED'
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '操作失败'
    ElMessage.error(errorMsg)
  }
}

async function resolve(row: any) {
  try {
    await api.post(`/alerts/${row.id}/resolve`, {
      operatorId: userStore.currentUser?.id,
      resolutionNote: '已处理'
    })
    ElMessage.success('已标记解决')
    row.status = 'RESOLVED'
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '操作失败'
    ElMessage.error(errorMsg)
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  fetchData()
  fetchAlerts()
})
</script>

<style scoped>
.mb-20 {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.details-text {
  color: #606266;
  font-size: 13px;
}

.pagination {
  margin-top: 20px;
  justify-content: flex-end;
  display: flex;
}

.item {
  margin-right: 20px;
}
</style>
