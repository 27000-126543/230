<template>
  <div class="reports">
    <el-card class="mb-20">
      <template #header>
        <div class="card-header">
          <span>月度报表</span>
          <div class="header-actions">
            <el-date-picker
              v-model="reportDate"
              type="month"
              value-format="YYYY-MM"
              placeholder="选择月份"
              @change="fetchReport"
            />
            <el-button type="primary" @click="fetchReport">
              <el-icon><Refresh /></el-icon>
              生成报表
            </el-button>
            <el-button type="success" @click="exportPDF">
              <el-icon><Download /></el-icon>
              导出PDF
            </el-button>
            <el-button type="warning" @click="exportExcel">
              <el-icon><Download /></el-icon>
              导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" v-if="reportData">
        <el-col :span="6">
          <el-statistic title="本月差旅总花费" :value="reportData.summary?.totalSpent || 0" prefix="¥" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="出差总次数" :value="reportData.summary?.tripCount || 0" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="人均费用" :value="reportData.summary?.avgPerPerson || 0" prefix="¥" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="预算超支次数" :value="reportData.summary?.overrunCount || 0" value-style="color: #f56c6c" />
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="mb-20">
          <template #header>
            <span>各部门费用对比</span>
          </template>
          <v-chart :option="deptChartOption" style="height: 350px" autoresize />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="mb-20">
          <template #header>
            <span>费用类别占比</span>
          </template>
          <v-chart :option="categoryChartOption" style="height: 350px" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="mb-20">
          <template #header>
            <span>近6个月趋势</span>
          </template>
          <v-chart :option="trendChartOption" style="height: 300px" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <span>各部门明细</span>
      </template>
      <el-table :data="departmentDetails" style="width: 100%">
        <el-table-column prop="departmentName" label="部门" width="150" />
        <el-table-column prop="totalSpent" label="总花费" width="120">
          <template #default="{ row }">¥{{ row.totalSpent?.toLocaleString() || 0 }}</template>
        </el-table-column>
        <el-table-column prop="budget" label="预算" width="120">
          <template #default="{ row }">¥{{ row.budget?.toLocaleString() || 0 }}</template>
        </el-table-column>
        <el-table-column prop="budgetUsage" label="预算使用率" width="150">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.budgetUsage || 0)" :status="row.budgetUsage > 100 ? 'exception' : 'success'" />
          </template>
        </el-table-column>
        <el-table-column prop="overrun" label="超支金额" width="120">
          <template #default="{ row }">
            <span v-if="row.overrun > 0" style="color: #f56c6c">+¥{{ row.overrun.toLocaleString() }}</span>
            <span v-else style="color: #67c23a">¥0</span>
          </template>
        </el-table-column>
        <el-table-column prop="tripCount" label="出差次数" width="100" />
        <el-table-column prop="avgPerTrip" label="单次平均" width="120">
          <template #default="{ row }">¥{{ row.avgPerTrip?.toLocaleString() || 0 }}</template>
        </el-table-column>
        <el-table-column prop="avgApprovalHours" label="平均审批时长" width="140">
          <template #default="{ row }">{{ row.avgApprovalHours || 0 }} 小时</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
} from 'echarts/components'
import api from '@/api'
import dayjs from 'dayjs'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
])

const reportDate = ref(dayjs().format('YYYY-MM'))
const reportData = reactive<any>({})
const departmentDetails = reactive<any[]>([])

const deptChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['预算', '实际花费'] },
  xAxis: {
    type: 'category',
    data: departmentDetails.map(d => d.departmentName)
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '预算',
      type: 'bar',
      data: departmentDetails.map(d => d.budget),
      itemStyle: { color: '#91cc75' }
    },
    {
      name: '实际花费',
      type: 'bar',
      data: departmentDetails.map(d => d.totalSpent),
      itemStyle: { color: '#fac858' }
    }
  ]
}))

const categoryChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: 45000, name: '交通', itemStyle: { color: '#5470c6' } },
        { value: 35000, name: '住宿', itemStyle: { color: '#91cc75' } },
        { value: 22000, name: '餐饮', itemStyle: { color: '#fac858' } },
        { value: 8000, name: '其他', itemStyle: { color: '#ee6666' } }
      ]
    }
  ]
}))

const trendChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['总花费', '出差次数'] },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月']
  },
  yAxis: [
    { type: 'value', name: '金额(元)' },
    { type: 'value', name: '次数' }
  ],
  series: [
    {
      name: '总花费',
      type: 'line',
      smooth: true,
      data: [85000, 92000, 78000, 105000, 98000, 110000],
      itemStyle: { color: '#5470c6' },
      areaStyle: { opacity: 0.3 }
    },
    {
      name: '出差次数',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: [12, 15, 10, 18, 16, 20],
      itemStyle: { color: '#91cc75' }
    }
  ]
}))

async function fetchReport() {
  try {
    const [year, month] = reportDate.value.split('-')
    const res = await api.get(`/reports/monthly/${year}/${month}`)
    if (res.data.success) {
      Object.assign(reportData, res.data.data)
      if (res.data.data.departments) {
        departmentDetails.splice(0, departmentDetails.length, ...res.data.data.departments)
      }
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '加载报表失败'
    ElMessage.error(errorMsg)
  }
}

async function exportPDF() {
  try {
    const [year, month] = reportDate.value.split('-')
    window.open(`/api/reports/monthly/${year}/${month}/pdf`, '_blank')
    ElMessage.success('PDF导出中...')
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'PDF导出失败'
    ElMessage.error(errorMsg)
  }
}

async function exportExcel() {
  try {
    const [year, month] = reportDate.value.split('-')
    window.open(`/api/reports/monthly/${year}/${month}/excel`, '_blank')
    ElMessage.success('Excel导出中...')
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Excel导出失败'
    ElMessage.error(errorMsg)
  }
}

onMounted(() => {
  fetchReport()
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

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
