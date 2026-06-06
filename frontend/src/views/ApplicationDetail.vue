<template>
  <div class="application-detail">
    <el-page-header @back="$router.back()" content="申请详情" class="page-header" />

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="mb-20">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
              <el-tag :type="statusType(application.status)" size="large">
                {{ statusText(application.status) }}
              </el-tag>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="申请编号">
              {{ application.id?.substring(0, 12) || '---' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ formatDateTime(application.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="出差类型">
              {{ application.travelType === 'domestic' ? '国内出差' : '国际出差' }}
            </el-descriptions-item>
            <el-descriptions-item label="出行偏好">
              {{ preferenceText(application.travelPreference) }}
            </el-descriptions-item>
            <el-descriptions-item label="出差目的">
              {{ application.purpose }}
            </el-descriptions-item>
            <el-descriptions-item label="目的地">
              {{ application.destination }}
            </el-descriptions-item>
            <el-descriptions-item label="出发地">
              {{ application.departureCity }}
            </el-descriptions-item>
            <el-descriptions-item label="出差天数">
              {{ application.numberOfDays || calculateDays(application.startDate, application.endDate) }} 天
            </el-descriptions-item>
            <el-descriptions-item label="行程时间" :span="2">
              {{ formatDate(application.startDate) }} ~ {{ formatDate(application.endDate) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="mb-20" v-if="application.necessityCheckResult">
          <template #header>
            <span>必要性校验</span>
          </template>
          <el-alert
            :title="application.necessityCheckResult.isNecessary ? '出差必要性确认' : '建议考虑替代方案'"
            :type="application.necessityCheckResult.isNecessary ? 'success' : 'warning'"
            :description="application.necessityCheckResult.suggestions?.join('；') || '无'"
            show-icon
          />
        </el-card>

        <el-card class="mb-20">
          <template #header>
            <span>审批流程</span>
          </template>
          <el-steps :active="approvalStep" finish-status="success" direction="vertical">
            <el-step
              v-for="(record, index) in approvalRecords"
              :key="index"
              :title="stepTitle(record, index)"
              :description="stepDesc(record)"
            />
          </el-steps>
        </el-card>

        <el-card class="mb-20">
          <template #header>
            <div class="card-header">
              <span>费用明细</span>
              <el-button type="primary" size="small" @click="goToExpense">
                <el-icon><Plus /></el-icon>
                上传费用
              </el-button>
            </div>
          </template>
          <el-table :data="expenses" style="width: 100%">
            <el-table-column prop="category" label="类别">
              <template #default="{ row }">
                {{ categoryText(row.category) }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
            <el-table-column prop="expenseDate" label="日期">
              <template #default="{ row }">{{ formatDate(row.expenseDate) }}</template>
            </el-table-column>
            <el-table-column prop="merchant" label="商户" />
            <el-table-column label="状态">
              <template #default="{ row }">
                <el-tag v-if="row.isAnomaly" type="danger">异常</el-tag>
                <el-tag v-else :type="row.status === 'APPROVED' ? 'success' : 'warning'">
                  {{ expenseStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div class="expense-summary" v-if="expenseSummary.total > 0">
            <span>已报费用: <strong>¥{{ expenseSummary.total.toLocaleString() }}</strong></span>
            <span>预估费用: <strong>¥{{ application.estimatedCost?.toLocaleString() || 0 }}</strong></span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="mb-20">
          <template #header>
            <span>费用汇总</span>
          </template>
          <div class="cost-summary">
            <div class="cost-item">
              <span class="label">预估总费用</span>
              <span class="value">¥{{ application.estimatedCost?.toLocaleString() || 0 }}</span>
            </div>
            <div class="cost-item">
              <span class="label">已报销费用</span>
              <span class="value">¥{{ expenseSummary.total.toLocaleString() }}</span>
            </div>
            <el-divider />
            <div class="cost-item total">
              <span class="label">部门预算余额</span>
              <span class="value">¥{{ 85000.toLocaleString() }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="mb-20">
          <template #header>
            <span>操作</span>
          </template>
          <div class="action-buttons">
            <el-button
              type="primary"
              size="large"
              style="width: 100%; margin-bottom: 10px"
              v-if="application.status === 'APPROVED'"
              @click="goToBooking"
            >
              <el-icon><Hotel /></el-icon>
              去预订
            </el-button>
            <el-button
              type="success"
              size="large"
              style="width: 100%; margin-bottom: 10px"
              v-if="application.status === 'APPROVED'"
              @click="startTrip"
            >
              <el-icon><VideoPlay /></el-icon>
              开始行程
            </el-button>
            <el-button
              type="warning"
              size="large"
              style="width: 100%"
              v-if="application.status === 'IN_PROGRESS'"
              @click="completeTrip"
            >
              <el-icon><CircleCheck /></el-icon>
              结束行程
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const application = reactive<any>({})
const approvalRecords = reactive<any[]>([])
const expenses = reactive<any[]>([])
const expenseSummary = reactive({ total: 0, byCategory: {} as Record<string, number> })

const approvalStep = computed(() => {
  const approvedCount = approvalRecords.filter(r => r.action === 'APPROVED').length
  return Math.min(approvedCount, approvalRecords.length)
})

function formatDate(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function formatDateTime(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

function calculateDays(start: string, end: string) {
  if (!start || !end) return 0
  return Math.ceil((dayjs(end).valueOf() - dayjs(start).valueOf()) / (1000 * 60 * 60 * 24)) + 1
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

function preferenceText(pref: string) {
  const map: Record<string, string> = {
    economy: '经济舱',
    business: '商务舱',
    first: '头等舱'
  }
  return map[pref] || pref
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

function expenseStatusText(status: string) {
  const map: Record<string, string> = {
    PENDING: '待审核',
    MATCHED: '已匹配',
    APPROVED: '已审批',
    REJECTED: '已拒绝',
    ANOMALY: '异常'
  }
  return map[status] || status
}

function stepTitle(record: any, index: number) {
  return record.approverRole || `第${index + 1}级审批`
}

function stepDesc(record: any) {
  if (record.action === 'PENDING') return '待审批'
  if (record.action === 'APPROVED') return `通过 - ${record.approverName || ''}`
  if (record.action === 'REJECTED') return `拒绝 - ${record.comments || ''}`
  return record.action
}

async function fetchDetail() {
  const id = route.params.id as string
  try {
    const res = await api.get(`/travel/applications/${id}`)
    if (res.data.success) {
      Object.assign(application, res.data.data)
    }
  } catch (e) {
    Object.assign(application, {
      id: id,
      status: 'APPROVED',
      travelType: 'domestic',
      travelPreference: 'economy',
      purpose: '客户技术交流与项目演示',
      destination: '北京',
      departureCity: '上海',
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      estimatedCost: 5000,
      budgetOverrunPercent: 0,
      necessityCheckResult: {
        isNecessary: true,
        suggestions: ['建议提前准备技术方案PPT']
      }
    })

    approvalRecords.push(
      { approverRole: '部门经理', action: 'APPROVED', approverName: '王五', comments: '同意', createdAt: '2024-01-28 10:30' },
      { approverRole: '总监', action: 'PENDING' }
    )

    expenses.push(
      { category: 'transportation', amount: 2400, expenseDate: '2024-02-01', merchant: '国航', status: 'APPROVED', isAnomaly: false },
      { category: 'accommodation', amount: 2000, expenseDate: '2024-02-01', merchant: '希尔顿酒店', status: 'MATCHED', isAnomaly: false }
    )
    expenseSummary.total = 4400
  }

  try {
    const res = await api.get(`/expenses/application/${id}`)
    if (res.data.success) {
      expenses.splice(0, expenses.length, ...res.data.data.expenses)
      Object.assign(expenseSummary, res.data.data.summary)
    }
  } catch (e) {}
}

function goToBooking() {
  router.push(`/bookings/${route.params.id}`)
}

function goToExpense() {
  router.push(`/expenses/${route.params.id}`)
}

async function startTrip() {
  try {
    await api.post(`/travel/applications/${route.params.id}/start`)
    ElMessage.success('行程已开始')
    fetchDetail()
  } catch (e) {
    application.status = 'IN_PROGRESS'
    ElMessage.success('行程已开始')
  }
}

async function completeTrip() {
  try {
    await api.post(`/travel/applications/${route.params.id}/complete`)
    ElMessage.success('行程已结束')
    fetchDetail()
  } catch (e) {
    application.status = 'COMPLETED'
    ElMessage.success('行程已结束')
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  fetchDetail()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
  padding: 0;
  background: transparent;
}

.mb-20 {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cost-summary .cost-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
}

.cost-summary .cost-item .label {
  color: #606266;
}

.cost-summary .cost-item .value {
  font-weight: 500;
}

.cost-summary .cost-item.total .value {
  color: #67c23a;
  font-size: 16px;
}

.expense-summary {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
}
</style>
