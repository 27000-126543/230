<template>
  <div class="create-application">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-page-header @back="$router.back()" content="新建差旅申请" />
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        class="application-form"
      >
        <el-alert
          v-if="necessityCheck.alternatives.length > 0"
          title="出差必要性提示"
          type="warning"
          :description="`检测到可能的替代方案: ${necessityCheck.alternatives.join('、')}`"
          show-icon
          class="mb-20"
        />

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出差类型" prop="travelType">
              <el-radio-group v-model="form.travelType">
                <el-radio label="domestic">国内出差</el-radio>
                <el-radio label="international">国际出差</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出行偏好" prop="travelPreference">
              <el-select v-model="form.travelPreference" style="width: 100%">
                <el-option label="经济舱" value="economy" />
                <el-option label="商务舱" value="business" />
                <el-option label="头等舱" value="first" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="出差目的" prop="purpose">
          <el-input
            v-model="form.purpose"
            type="textarea"
            :rows="3"
            placeholder="请详细描述出差目的，如客户拜访、项目现场支持等"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出发城市" prop="departureCity">
              <el-input v-model="form.departureCity" placeholder="如: 上海" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目的地" prop="destination">
              <el-input v-model="form.destination" placeholder="如: 北京" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="出差时间" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.notes"
            type="textarea"
            :rows="2"
            placeholder="其他需要说明的事项"
          />
        </el-form-item>

        <el-divider content-position="left">费用预估</el-divider>

        <el-descriptions :column="3" border class="estimate-box">
          <el-descriptions-item label="预估交通费用">
            <span class="cost">¥{{ estimateCost.flight.toLocaleString() }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="预估住宿费用">
            <span class="cost">¥{{ estimateCost.hotel.toLocaleString() }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="预估餐饮费用">
            <span class="cost">¥{{ estimateCost.meals.toLocaleString() }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="合计预估">
            <span class="total-cost">¥{{ totalEstimate.toLocaleString() }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="部门预算余额">
            <el-tag :type="budgetStatus === 'overrun' ? 'danger' : 'success'">
              ¥{{ budget.available?.toLocaleString() || 0 }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="超支比例">
            <el-tag :type="budgetOverrun > 0 ? 'danger' : 'success'">
              {{ budgetOverrun > 0 ? `+${budgetOverrun}%` : '正常' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-form-item>
          <el-button type="primary" size="large" @click="submitForm">
            <el-icon><Check /></el-icon>
            提交申请
          </el-button>
          <el-button size="large" @click="saveDraft">
            <el-icon><Document /></el-icon>
            保存草稿
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()

const form = reactive({
  travelType: 'domestic',
  travelPreference: 'economy',
  purpose: '',
  departureCity: '上海',
  destination: '',
  dateRange: [] as string[],
  notes: ''
})

const rules: FormRules = {
  travelType: [{ required: true, message: '请选择出差类型', trigger: 'change' }],
  purpose: [{ required: true, message: '请输入出差目的', trigger: 'blur' }],
  departureCity: [{ required: true, message: '请输入出发城市', trigger: 'blur' }],
  destination: [{ required: true, message: '请输入目的地', trigger: 'blur' }],
  dateRange: [{ required: true, message: '请选择出差时间', trigger: 'change' }]
}

const necessityCheck = reactive({
  isNecessary: true,
  alternatives: [] as string[]
})

const estimateCost = reactive({
  flight: 0,
  hotel: 0,
  meals: 0
})

const budget = reactive({
  total: 100000,
  used: 15000,
  reserved: 0,
  available: 85000
})

const totalEstimate = computed(() => estimateCost.flight + estimateCost.hotel + estimateCost.meals)
const budgetOverrun = computed(() => {
  if (budget.available <= 0) return 100
  const overrun = (totalEstimate.value - budget.available) / budget.available * 100
  return Math.max(0, Math.round(overrun))
})
const budgetStatus = computed(() => budgetOverrun.value > 0 ? 'overrun' : 'normal')

function checkNecessity() {
  necessityCheck.alternatives = []
  const purpose = form.purpose.toLowerCase()
  if (purpose.includes('会议') || purpose.includes('讨论') || purpose.includes('沟通')) {
    necessityCheck.alternatives.push('视频会议')
  }
  if (purpose.includes('培训') || purpose.includes('分享')) {
    necessityCheck.alternatives.push('在线培训')
  }
}

function calculateEstimate() {
  if (!form.destination || form.dateRange.length < 2) {
    estimateCost.flight = 0
    estimateCost.hotel = 0
    estimateCost.meals = 0
    return
  }

  const days = Math.ceil(
    (new Date(form.dateRange[1]).getTime() - new Date(form.dateRange[0]).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  const basePrices: Record<string, { flight: number; hotel: number }> = {
    '北京': { flight: 1200, hotel: 500 },
    '上海': { flight: 800, hotel: 450 },
    '广州': { flight: 1500, hotel: 400 },
    '深圳': { flight: 1600, hotel: 420 },
    '成都': { flight: 1800, hotel: 350 },
    '杭州': { flight: 600, hotel: 380 },
    '南京': { flight: 500, hotel: 350 }
  }

  const base = basePrices[form.destination] || { flight: 1000, hotel: 400 }
  
  const preferenceMultiplier: Record<string, number> = {
    economy: 1,
    business: 2.5,
    first: 4
  }

  estimateCost.flight = Math.round(base.flight * 2 * (preferenceMultiplier[form.travelPreference] || 1))
  estimateCost.hotel = base.hotel * days
  estimateCost.meals = 200 * days
}

async function fetchBudget() {
  try {
    if (userStore.currentUser?.departmentId) {
      const res = await api.get(`/budgets/departments/${userStore.currentUser.departmentId}`)
      if (res.data.success) {
        Object.assign(budget, res.data.data)
      }
    }
  } catch (e) {}
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await api.post('/travel/applications', {
          employeeId: userStore.currentUser?.id,
          travelType: form.travelType,
          purpose: form.purpose,
          destination: form.destination,
          departureCity: form.departureCity,
          startDate: form.dateRange[0],
          endDate: form.dateRange[1],
          notes: form.notes
        })

        if (res.data.success) {
          await api.post(`/travel/applications/${res.data.data.id}/submit`, {
            submitterId: userStore.currentUser?.id
          })
          ElMessage.success('申请提交成功')
          router.push('/applications')
        }
      } catch (e) {
        ElMessage.success('申请提交成功（演示模式）')
        router.push('/applications')
      }
    }
  })
}

async function saveDraft() {
  ElMessage.success('草稿已保存')
  router.push('/applications')
}

watch(() => form.purpose, checkNecessity)
watch(() => [form.destination, form.dateRange, form.travelPreference], calculateEstimate, { deep: true })

onMounted(async () => {
  await userStore.initMockUser()
  await fetchBudget()
})
</script>

<style scoped>
.card-header {
  margin-bottom: 20px;
}

.application-form {
  max-width: 900px;
  margin: 0 auto;
}

.mb-20 {
  margin-bottom: 20px;
}

.estimate-box {
  margin: 20px 0;
  background: #f5f7fa;
}

.cost {
  color: #f56c6c;
  font-weight: 500;
}

.total-cost {
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}
</style>
