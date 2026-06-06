<template>
  <div class="approvals">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>审批中心</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="待我审批" name="pending">
          <el-table :data="pendingList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="申请编号" width="140">
              <template #default="{ row }">
                {{ row.id?.substring(0, 8) || '---' }}
              </template>
            </el-table-column>
            <el-table-column prop="employeeName" label="申请人" width="100" />
            <el-table-column prop="departmentName" label="部门" width="120" />
            <el-table-column prop="purpose" label="出差目的" min-width="150" />
            <el-table-column prop="destination" label="目的地" width="100" />
            <el-table-column label="行程" width="180">
              <template #default="{ row }">
                {{ formatDate(row.startDate) }} ~ {{ formatDate(row.endDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="estimatedCost" label="预估费用" width="120">
              <template #default="{ row }">
                ¥{{ row.estimatedCost?.toLocaleString() || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="budgetOverrunPercent" label="超支" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.budgetOverrunPercent > 50" type="danger" size="small">
                  +{{ row.budgetOverrunPercent }}%
                </el-tag>
                <el-tag v-else-if="row.budgetOverrunPercent > 20" type="warning" size="small">
                  +{{ row.budgetOverrunPercent }}%
                </el-tag>
                <el-tag v-else type="success" size="small">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="150">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewDetail(row)">查看</el-button>
                <el-button type="success" link size="small" @click="approve(row)">批准</el-button>
                <el-button type="danger" link size="small" @click="reject(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="我发起的" name="my">
          <el-table :data="myList" style="width: 100%">
            <el-table-column prop="id" label="申请编号" width="140">
              <template #default="{ row }">
                {{ row.id?.substring(0, 8) || '---' }}
              </template>
            </el-table-column>
            <el-table-column prop="purpose" label="出差目的" min-width="150" />
            <el-table-column prop="destination" label="目的地" width="100" />
            <el-table-column label="行程" width="180">
              <template #default="{ row }">
                {{ formatDate(row.startDate) }} ~ {{ formatDate(row.endDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="estimatedCost" label="预估费用" width="120">
              <template #default="{ row }">
                ¥{{ row.estimatedCost?.toLocaleString() || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="approvalLevel" label="审批级别" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ approvalLevelText(row.approvalLevel) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="当前状态" width="100">
              <template #default="{ row }">
                <el-steps :active="getCurrentStep(row)" finish-status="success" size="small" simple>
                  <el-step title="提交" />
                  <el-step title="经理" />
                  <el-step v-if="row.budgetOverrunPercent > 20" title="总监" />
                  <el-step v-if="row.budgetOverrunPercent > 50" title="CFO" />
                </el-steps>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已审批" name="approved">
          <el-table :data="approvedList" style="width: 100%">
            <el-table-column prop="id" label="申请编号" width="140" />
            <el-table-column prop="employeeName" label="申请人" width="100" />
            <el-table-column prop="purpose" label="出差目的" min-width="150" />
            <el-table-column label="我的审批" width="100">
              <template #default="{ row }">
                <el-tag :type="row.myAction === 'APPROVED' ? 'success' : 'danger'">
                  {{ row.myAction === 'APPROVED' ? '已批准' : '已拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="审批时间" width="150">
              <template #default="{ row }">
                {{ formatDateTime(row.approvedAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="rejectDialogVisible" title="拒绝申请" width="400px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="拒绝原因">
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('pending')
const loading = reactive({ value: false })
const pendingList = reactive<any[]>([])
const myList = reactive<any[]>([])
const approvedList = reactive<any[]>([])

const rejectDialogVisible = ref(false)
const rejectForm = reactive({ reason: '', currentId: '' })

function formatDate(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function formatDateTime(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

function approvalLevelText(level: string) {
  const map: Record<string, string> = {
    MANAGER: '经理级',
    DIRECTOR: '总监级',
    CFO: 'CFO级'
  }
  return map[level] || level
}

function getCurrentStep(row: any) {
  if (row.status === 'REJECTED') return 0
  if (row.status === 'APPROVED') return 4
  return 1
}

async function fetchPending() {
  loading.value = true
  try {
    if (userStore.currentUser) {
      const res = await api.get(`/travel/approvers/${userStore.currentUser.id}/pending`)
      if (res.data.success) {
        const data = res.data.data
        pendingList.splice(0, pendingList.length, ...(data.rows || data.data || []))
      }
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载待审批列表失败'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

async function fetchMy() {
  try {
    if (userStore.currentUser) {
      const res = await api.get(`/travel/employees/${userStore.currentUser.id}/applications`)
      if (res.data.success) {
        const data = res.data.data
        myList.splice(0, myList.length, ...(data.rows || data.data || []))
      }
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载我的申请失败'
    ElMessage.error(errorMsg)
  }
}

async function fetchApproved() {
  try {
    const res = await api.get('/travel/approved-approvals')
    if (res.data.success) {
      approvedList.splice(0, approvedList.length, ...(res.data.data || []))
    }
  } catch (error: any) {
    // 已审批列表接口可能不存在，静默失败
  }
}

function viewDetail(row: any) {
  router.push(`/applications/${row.id}`)
}

async function approve(row: any) {
  try {
    await ElMessageBox.confirm('确定批准此差旅申请吗？', '确认批准', {
      type: 'success'
    })
    await api.post(`/travel/applications/${row.id}/approve`, {
      approverId: userStore.currentUser?.id
    })
    ElMessage.success('已批准')
    const idx = pendingList.findIndex(i => i.id === row.id)
    if (idx > -1) pendingList.splice(idx, 1)
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '审批失败'
    ElMessage.error(errorMsg)
  }
}

function reject(row: any) {
  rejectForm.currentId = row.id
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

async function confirmReject() {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  try {
    await api.post(`/travel/applications/${rejectForm.currentId}/reject`, {
      approverId: userStore.currentUser?.id,
      rejectionReason: rejectForm.reason
    })
    ElMessage.success('已拒绝')
    rejectDialogVisible.value = false
    const idx = pendingList.findIndex(i => i.id === rejectForm.currentId)
    if (idx > -1) pendingList.splice(idx, 1)
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '拒绝失败'
    ElMessage.error(errorMsg)
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  await Promise.all([
    fetchPending(),
    fetchMy(),
    fetchApproved()
  ])
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
