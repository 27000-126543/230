<template>
  <div class="budget">
    <el-card class="mb-20">
      <template #header>
        <div class="card-header">
          <span>部门预算</span>
          <div class="header-actions">
            <el-date-picker
              v-model="currentMonth"
              type="month"
              value-format="YYYY-MM"
              placeholder="选择月份"
              @change="fetchBudgets"
            />
          </div>
        </div>
      </template>

      <el-table :data="budgetList" style="width: 100%">
        <el-table-column prop="departmentName" label="部门" width="150" />
        <el-table-column prop="total" label="总预算" width="130">
          <template #default="{ row }">
            <span class="budget-text">¥{{ row.total?.toLocaleString() || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="used" label="已使用" width="130">
          <template #default="{ row }">
            <span class="used-text">¥{{ row.used?.toLocaleString() || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reserved" label="已预留" width="130">
          <template #default="{ row }">
            <span class="reserved-text">¥{{ row.reserved?.toLocaleString() || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="available" label="可用余额" width="130">
          <template #default="{ row }">
            <span :class="row.available > 0 ? 'available-text' : 'overrun-text'">
              ¥{{ row.available?.toLocaleString() || 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="使用率" width="250">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.used + row.reserved) / row.total * 100)"
              :status="(row.used + row.reserved) > row.total ? 'exception' : 'success'"
            />
          </template>
        </el-table-column>
        <el-table-column label="下月扣减" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.nextMonthDeduction > 0" type="danger" size="small">
              -¥{{ row.nextMonthDeduction?.toLocaleString() }}
            </el-tag>
            <el-tag v-else type="success" size="small">无</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>预算使用进度</span>
          </template>
          <div v-for="item in budgetList" :key="item.id" class="budget-item">
            <div class="budget-item-header">
              <span>{{ item.departmentName }}</span>
              <span>
                ¥{{ item.used?.toLocaleString() }} / ¥{{ item.total?.toLocaleString() }}
              </span>
            </div>
            <el-progress
              :percentage="Math.round(item.used / item.total * 100)"
              :status="item.used > item.total ? 'exception' : undefined"
              :stroke-width="12"
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>预警说明</span>
          </template>
          <el-steps direction="vertical" :active="2">
            <el-step title="正常" description="使用率 < 80%" />
            <el-step title="注意" description="使用率 80% ~ 100%" />
            <el-step title="预警" description="使用率 > 100%，触发超支预警" />
          </el-steps>
          <el-alert
            title="超额扣减规则"
            type="warning"
            description="每月1号自动将上月超支部分从下月预算中扣减，同时触发CFO级审批预警"
            show-icon
            class="mt-20"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api from '@/api'
import dayjs from 'dayjs'

const currentMonth = ref(dayjs().format('YYYY-MM'))
const budgetList = reactive<any[]>([])

async function fetchBudgets() {
  try {
    const [year, month] = currentMonth.value.split('-')
    const res = await api.get('/budgets/departments', { params: { year, month } })
    if (res.data.success) {
      budgetList.splice(0, budgetList.length, ...res.data.data)
    }
  } catch (e) {
    budgetList.splice(0, budgetList.length,
      {
        id: '1',
        departmentName: '技术研发部',
        total: 100000,
        used: 55000,
        reserved: 15000,
        available: 30000,
        nextMonthDeduction: 5000
      },
      {
        id: '2',
        departmentName: '市场营销部',
        total: 80000,
        used: 40000,
        reserved: 10000,
        available: 30000,
        nextMonthDeduction: 0
      },
      {
        id: '3',
        departmentName: '财务部',
        total: 50000,
        used: 15000,
        reserved: 5000,
        available: 30000,
        nextMonthDeduction: 0
      }
    )
  }
}

onMounted(() => {
  fetchBudgets()
})
</script>

<style scoped>
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

.budget-text {
  color: #409eff;
  font-weight: 500;
}

.used-text {
  color: #e6a23c;
  font-weight: 500;
}

.reserved-text {
  color: #909399;
  font-weight: 500;
}

.available-text {
  color: #67c23a;
  font-weight: 500;
}

.overrun-text {
  color: #f56c6c;
  font-weight: 500;
}

.budget-item {
  margin-bottom: 20px;
}

.budget-item:last-child {
  margin-bottom: 0;
}

.budget-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
</style>
