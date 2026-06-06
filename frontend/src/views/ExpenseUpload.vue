<template>
  <div class="expense-upload">
    <el-page-header @back="$router.back()" content="上传费用小票" class="page-header" />

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="mb-20">
          <template #header>
            <span><el-icon><Camera /></el-icon> 拍照/上传小票</span>
          </template>

          <el-upload
            class="upload-area"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleFileChange"
            list-type="picture-card"
          >
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">将小票拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="upload-tip">支持 JPG、PNG 格式，单张不超过 10MB</div>
            </template>
          </el-upload>

          <div class="preview-area" v-if="previewImage">
            <el-image :src="previewImage" fit="contain" class="preview-image" />
          </div>

          <el-button
            type="primary"
            size="large"
            style="width: 100%; margin-top: 20px"
            :loading="ocrLoading"
            :disabled="!currentFile"
            @click="startOCR"
          >
            <el-icon><Search /></el-icon>
            {{ ocrLoading ? 'OCR识别中...' : '开始OCR识别' }}
          </el-button>
        </el-card>

        <el-card>
          <template #header>
            <span>或手动录入费用</span>
          </template>
          <el-form :model="manualForm" label-width="100px">
            <el-form-item label="费用类别">
              <el-select v-model="manualForm.category" style="width: 100%">
                <el-option label="交通" value="transportation" />
                <el-option label="住宿" value="accommodation" />
                <el-option label="餐饮" value="meals" />
                <el-option label="通讯" value="communication" />
                <el-option label="招待" value="entertainment" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item label="金额">
              <el-input-number v-model="manualForm.amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
            <el-form-item label="消费日期">
              <el-date-picker
                v-model="manualForm.expenseDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="商户名称">
              <el-input v-model="manualForm.merchant" placeholder="可选" />
            </el-form-item>
            <el-form-item label="消费地点">
              <el-input v-model="manualForm.location" placeholder="可选" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitManual">提交录入</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="mb-20" v-if="ocrResult.amount">
          <template #header>
            <div class="card-header">
              <span><el-icon><DocumentCopy /></el-icon> OCR识别结果</span>
              <el-tag :type="ocrResult.confidence > 85 ? 'success' : 'warning'">
                置信度 {{ ocrResult.confidence }}%
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="识别金额">
              <span class="ocr-amount">¥{{ ocrResult.amount?.toLocaleString() || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="消费日期">
              {{ ocrResult.date ? formatDate(ocrResult.date) : '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="商户名称">
              {{ ocrResult.merchant || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="费用类别">
              <el-tag>{{ categoryText(ocrResult.category) }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <el-alert
            v-if="matchResult.isAnomaly"
            title="检测到异常"
            type="error"
            :description="matchResult.reasons?.join('；')"
            show-icon
            class="mt-20"
          />
          <el-alert
            v-else-if="ocrResult.amount"
            title="匹配成功"
            type="success"
            description="消费信息与行程匹配"
            show-icon
            class="mt-20"
          />

          <el-form :model="ocrResult" label-width="100px" class="mt-20">
            <el-form-item label="确认金额">
              <el-input-number v-model="ocrResult.amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
            <el-form-item label="确认类别">
              <el-select v-model="ocrResult.category" style="width: 100%">
                <el-option label="交通" value="transportation" />
                <el-option label="住宿" value="accommodation" />
                <el-option label="餐饮" value="meals" />
                <el-option label="通讯" value="communication" />
                <el-option label="招待" value="entertainment" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="success" size="large" style="width: 100%" @click="confirmExpense">
                <el-icon><Check /></el-icon>
                确认并提交费用
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <template #header>
            <div class="card-header">
              <span>本次申请费用列表</span>
              <span class="total">合计: <strong>¥{{ totalExpense.toLocaleString() }}</strong></span>
            </div>
          </template>
          <el-table :data="expenseList" style="width: 100%" size="small">
            <el-table-column prop="category" label="类别" width="80">
              <template #default="{ row }">{{ categoryText(row.category) }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="90">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
            <el-table-column prop="expenseDate" label="日期" width="100">
              <template #default="{ row }">{{ formatDate(row.expenseDate) }}</template>
            </el-table-column>
            <el-table-column prop="merchant" label="商户" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.isAnomaly" type="danger" size="small">异常</el-tag>
                <el-tag v-else type="success" size="small">正常</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import api from '@/api'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const currentFile = ref<File | null>(null)
const previewImage = ref('')
const ocrLoading = ref(false)

const ocrResult = reactive<{
  amount?: number
  date?: string
  merchant?: string
  category: string
  confidence: number
}>({
  category: 'other',
  confidence: 0
})

const matchResult = reactive({
  isAnomaly: false,
  reasons: [] as string[]
})

const manualForm = reactive({
  category: 'meals',
  amount: 0,
  expenseDate: '',
  merchant: '',
  location: ''
})

const expenseList = reactive<any[]>([])

const totalExpense = computed(() =>
  expenseList.reduce((sum, item) => sum + (item.amount || 0), 0)
)

function formatDate(date: string | Date) {
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

function handleFileChange(file: UploadFile) {
  currentFile.value = file.raw!
  const reader = new FileReader()
  reader.onload = (e) => {
    previewImage.value = e.target?.result as string
  }
  reader.readAsDataURL(file.raw!)
}

async function startOCR() {
  if (!currentFile.value) {
    ElMessage.warning('请先选择图片文件')
    return
  }
  
  ocrLoading.value = true
  try {
    const formData = new FormData()
    formData.append('receipt', currentFile.value)
    formData.append('applicationId', route.params.applicationId as string)
    formData.append('employeeId', userStore.currentUser?.id || '')

    const res = await api.post('/expenses/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })

    if (res.data.success) {
      const data = res.data.data
      ocrResult.amount = data.amount
      ocrResult.date = data.expenseDate
      ocrResult.merchant = data.merchant
      ocrResult.category = data.category || 'other'
      ocrResult.confidence = data.ocrConfidence || 85

      matchResult.isAnomaly = data.isAnomaly
      matchResult.reasons = data.anomalyReason ? [data.anomalyReason] : []

      ElMessage.success('OCR识别完成')
      await fetchExpenses()
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'OCR识别失败，请检查图片是否清晰后重试'
    ElMessage.error(errorMsg)
    
    ocrResult.amount = undefined
    ocrResult.date = undefined
    ocrResult.merchant = ''
    ocrResult.category = 'other'
    ocrResult.confidence = 0
    matchResult.isAnomaly = false
    matchResult.reasons = []
  } finally {
    ocrLoading.value = false
  }
}

async function confirmExpense() {
  if (!ocrResult.amount) {
    ElMessage.warning('请输入金额')
    return
  }
  try {
    const applicationId = route.params.applicationId as string
    await api.post('/expenses', {
      applicationId,
      employeeId: userStore.currentUser?.id,
      category: ocrResult.category,
      amount: ocrResult.amount,
      expenseDate: ocrResult.date || new Date().toISOString().split('T')[0],
      merchant: ocrResult.merchant
    })
    ElMessage.success('费用已提交')
    resetOCR()
    await fetchExpenses()
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '提交失败'
    ElMessage.error(errorMsg)
  }
}

async function submitManual() {
  if (!manualForm.amount) {
    ElMessage.warning('请输入金额')
    return
  }
  try {
    const applicationId = route.params.applicationId as string
    await api.post('/expenses', {
      applicationId,
      employeeId: userStore.currentUser?.id,
      category: manualForm.category,
      amount: manualForm.amount,
      expenseDate: manualForm.expenseDate || new Date().toISOString().split('T')[0],
      merchant: manualForm.merchant,
      location: manualForm.location
    })
    ElMessage.success('录入成功')
    manualForm.amount = 0
    manualForm.merchant = ''
    manualForm.location = ''
    await fetchExpenses()
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '录入失败'
    ElMessage.error(errorMsg)
  }
}

function addExpenseToList(expense: any) {
  expenseList.unshift({ ...expense, id: Date.now().toString() })
}

function resetOCR() {
  currentFile.value = null
  previewImage.value = ''
  ocrResult.amount = undefined
  ocrResult.date = undefined
  ocrResult.merchant = ''
  ocrResult.category = 'other'
  ocrResult.confidence = 0
  matchResult.isAnomaly = false
  matchResult.reasons = []
}

async function fetchExpenses() {
  const applicationId = route.params.applicationId as string
  try {
    const res = await api.get(`/expenses/application/${applicationId}`)
    if (res.data.success) {
      expenseList.splice(0, expenseList.length, ...(res.data.data.expenses || res.data.data || []))
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载费用列表失败'
    ElMessage.error(errorMsg)
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  fetchExpenses()
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

.mt-20 {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-area {
  margin-bottom: 20px;
}

.upload-icon {
  font-size: 67px;
  color: #c0c4cc;
  margin-bottom: 10px;
}

.upload-text {
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
}

.preview-area {
  margin: 20px 0;
  text-align: center;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}

.ocr-amount {
  color: #f56c6c;
  font-size: 20px;
  font-weight: bold;
}

.total {
  font-size: 14px;
  color: #606266;
}

.total strong {
  color: #f56c6c;
  font-size: 16px;
}
</style>
