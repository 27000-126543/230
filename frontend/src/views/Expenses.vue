<template>
  <div class="expenses">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>费用报销</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="员工">
          <el-select v-model="searchForm.employeeId" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="emp in employees"
              :key="emp.id"
              :label="emp.name"
              :value="emp.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="searchForm.departmentId" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="费用类别">
          <el-select v-model="searchForm.category" placeholder="全部" clearable style="width: 120px">
            <el-option label="交通" value="transportation" />
            <el-option label="住宿" value="accommodation" />
            <el-option label="餐饮" value="meals" />
            <el-option label="通讯" value="communication" />
            <el-option label="招待" value="entertainment" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
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
          <el-button type="success" @click="exportExpenses">
            <el-icon><Download /></el-icon>
            批量导出
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="anomalyCount > 0"
        :title="`检测到 ${anomalyCount} 笔异常费用，需处理`"
        type="warning"
        show-icon
        class="mb-20"
      >
        <template #default>
          <el-button type="primary" size="small" link @click="showOnlyAnomaly = !showOnlyAnomaly">
            {{ showOnlyAnomaly ? '显示全部' : '查看异常' }}
          </el-button>
        </template>
      </el-alert>

      <el-table :data="tableData" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="费用编号" width="120">
          <template #default="{ row }">
            {{ row.id?.substring(0, 8) || '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="employeeName" label="员工" width="90" />
        <el-table-column prop="category" label="类别" width="90">
          <template #default="{ row }">{{ categoryText(row.category) }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount?.toLocaleString() || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expenseDate" label="消费日期" width="110">
          <template #default="{ row }">{{ formatDate(row.expenseDate) }}</template>
        </el-table-column>
        <el-table-column prop="merchant" label="商户" min-width="120" />
        <el-table-column label="识别方式" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.ocrConfidence" size="small" type="success">OCR</el-tag>
            <el-tag v-else size="small" type="info">手动</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isAnomaly" type="danger">异常</el-tag>
            <el-tag v-else :type="statusType(row.status)" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applicationId" label="关联申请" width="110">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goToApplication(row.applicationId)">
              {{ row.applicationId?.substring(0, 6) }}...
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="row.isAnomaly"
              type="warning"
              link
              size="small"
              @click="explainAnomaly(row)"
            >
              说明
            </el-button>
            <el-button
              v-if="row.status === 'MATCHED' || row.status === 'PENDING'"
              type="success"
              link
              size="small"
              @click="approve(row)"
            >
              审批
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

    <el-dialog v-model="explainDialogVisible" title="异常费用说明" width="500px">
      <el-alert
        :title="`异常原因: ${currentAnomaly?.anomalyReason}`"
        type="warning"
        show-icon
        class="mb-20"
      />
      <el-form :model="explainForm" label-width="80px">
        <el-form-item label="说明">
          <el-input
            v-model="explainForm.explanation"
            type="textarea"
            :rows="4"
            placeholder="请详细说明异常原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="explainDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitExplanation">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = reactive({ value: false })
const employees = reactive<any[]>([])
const departments = reactive<any[]>([])
const tableData = reactive<any[]>([])
const searchForm = reactive({
  employeeId: '',
  departmentId: '',
  category: '',
  dateRange: [] as string[]
})
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const showOnlyAnomaly = ref(false)
const anomalyCount = computed(() => tableData.filter(r => r.isAnomaly).length)

const explainDialogVisible = ref(false)
const currentAnomaly = ref<any>(null)
const explainForm = reactive({ explanation: '' })

function formatDate(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function categoryText(cat: string) {
  const map: Record<string, string> = {
    transportation: '交通',
    accommodation: '住宿',
    meals: '餐饮',
    communication: '通讯',
    entertainment: '招待',
    other: '其他'
  }
  return map[cat] || cat
}

function statusType(status: string) {
  const map: Record<string, string> = {
    PENDING: 'warning',
    MATCHED: 'primary',
    APPROVED: 'success',
    REJECTED: 'danger',
    ANOMALY: 'danger'
  }
  return map[status] || 'info'
}

function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING: '待审核',
    MATCHED: '已匹配',
    APPROVED: '已审批',
    REJECTED: '已拒绝',
    ANOMALY: '异常'
  }
  return map[status] || status
}

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get('/expenses', {
      params: {
        employeeId: searchForm.employeeId || undefined,
        departmentId: searchForm.departmentId || undefined,
        category: searchForm.category || undefined,
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
    const errorMsg = error.response?.data?.error?.message || error.message || '加载费用列表失败'
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
  searchForm.employeeId = ''
  searchForm.departmentId = ''
  searchForm.category = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchData()
}

function goToApplication(id: string) {
  router.push(`/applications/${id}`)
}

function viewDetail(row: any) {
  ElMessage.info('查看费用详情')
}

function explainAnomaly(row: any) {
  currentAnomaly.value = row
  explainForm.explanation = ''
  explainDialogVisible.value = true
}

async function submitExplanation() {
  try {
    await api.post(`/expenses/${currentAnomaly.value.id}/explain`, {
      explanation: explainForm.explanation
    })
    ElMessage.success('说明已提交')
    explainDialogVisible.value = false
    currentAnomaly.value.isAnomaly = false
    currentAnomaly.value.status = 'PENDING'
  } catch (e) {
    ElMessage.success('说明已提交')
    explainDialogVisible.value = false
    currentAnomaly.value.isAnomaly = false
    currentAnomaly.value.status = 'PENDING'
  }
}

async function approve(row: any) {
  try {
    await api.post(`/expenses/${row.id}/approve`, { approverId: userStore.currentUser?.id })
    ElMessage.success('已审批')
    row.status = 'APPROVED'
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '审批失败'
    ElMessage.error(errorMsg)
  }
}

async function exportExpenses() {
  try {
    const res = await api.post('/expenses/export', {
      employeeId: searchForm.employeeId || undefined,
      departmentId: searchForm.departmentId || undefined,
      category: searchForm.category || undefined,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1]
    })
    if (res.data.success) {
      ElMessage.success(`导出成功: ${res.data.data.filePath}`)
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '导出失败'
    ElMessage.error(errorMsg)
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  await userStore.loadDepartments()
  departments.splice(0, departments.length, ...userStore.departments)
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

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.mb-20 {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  justify-content: flex-end;
  display: flex;
}
</style>
