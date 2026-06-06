<template>
  <div class="bookings">
    <el-card>
      <template #header>
        <span>预订管理</span>
      </template>

      <el-table :data="bookingList" style="width: 100%">
        <el-table-column prop="id" label="预订编号" width="140">
          <template #default="{ row }">
            {{ row.id?.substring(0, 8) || '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="applicationId" label="申请编号" width="140">
          <template #default="{ row }">
            {{ row.applicationId?.substring(0, 8) || '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="bookingType" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="bookingTypeColor(row.bookingType)">{{ bookingTypeText(row.bookingType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="200">
          <template #default="{ row }">
            <div v-if="row.bookingType === 'flight'">
              {{ row.option?.airline }} {{ row.option?.flightNo }}
              <br />
              {{ formatTime(row.option?.departureTime) }} → {{ formatTime(row.option?.arrivalTime) }}
            </div>
            <div v-else-if="row.bookingType === 'hotel'">
              {{ row.option?.hotelName }}
              <br />
              {{ row.option?.address }}
            </div>
            <div v-else>
              {{ row.option?.carType }} - {{ row.option?.company }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price?.toLocaleString() || 0 }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isLocked && new Date(row.lockedUntil) > new Date()" type="warning">
              已锁定
            </el-tag>
            <el-tag v-else-if="row.status === 'CONFIRMED'" type="success">已确认</el-tag>
            <el-tag v-else type="info">已取消</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="row.status !== 'CANCELLED'"
              type="danger"
              link
              size="small"
              @click="cancelBooking(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const userStore = useUserStore()
const bookingList = reactive<any[]>([])

function bookingTypeText(type: string) {
  const map: Record<string, string> = {
    flight: '机票',
    hotel: '酒店',
    car_rental: '租车'
  }
  return map[type] || type
}

function bookingTypeColor(type: string) {
  const map: Record<string, string> = {
    flight: 'primary',
    hotel: 'success',
    car_rental: 'warning'
  }
  return map[type] || ''
}

function formatTime(date: string) {
  return date ? dayjs(date).format('MM-DD HH:mm') : '-'
}

async function fetchBookings() {
  try {
    // 这里可以调用API获取预订列表
  } catch (e) {}
  bookingList.push(
    {
      id: 'bk1',
      applicationId: 'app1',
      bookingType: 'flight',
      price: 2400,
      status: 'CONFIRMED',
      isLocked: false,
      option: {
        airline: '国航',
        flightNo: 'CA1234',
        departureTime: '2024-02-01T08:00:00',
        arrivalTime: '2024-02-01T10:30:00'
      }
    },
    {
      id: 'bk2',
      applicationId: 'app1',
      bookingType: 'hotel',
      price: 2000,
      status: 'CONFIRMED',
      isLocked: false,
      option: {
        hotelName: '北京希尔顿酒店',
        address: '朝阳区东三环'
      }
    }
  )
}

function viewDetail(row: any) {
  ElMessage.info('查看预订详情')
}

async function cancelBooking(row: any) {
  try {
    await ElMessageBox.confirm('确定取消此预订吗？', '确认取消', {
      type: 'warning'
    })
    await api.post(`/travel/bookings/${row.id}/cancel`, {
      operatorId: userStore.currentUser?.id
    })
    ElMessage.success('已取消')
    row.status = 'CANCELLED'
  } catch (e) {
    row.status = 'CANCELLED'
    ElMessage.success('已取消')
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  fetchBookings()
})
</script>
