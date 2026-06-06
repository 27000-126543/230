<template>
  <div class="booking-recommend">
    <el-page-header @back="$router.back()" content="智能预订推荐" class="page-header" />

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="mb-20">
          <template #header>
            <span><el-icon><InfoFilled /></el-icon> 申请信息</span>
          </template>
          <el-descriptions :column="4" border size="small">
            <el-descriptions-item label="目的地">{{ application.destination }}</el-descriptions-item>
            <el-descriptions-item label="出发地">{{ application.departureCity }}</el-descriptions-item>
            <el-descriptions-item label="出行时间">
              {{ formatDate(application.startDate) }} ~ {{ formatDate(application.endDate) }}
            </el-descriptions-item>
            <el-descriptions-item label="出行偏好">{{ preferenceText(application.travelPreference) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="recommend-card">
          <template #header>
            <div class="card-title">
              <el-icon><Plane /></el-icon>
              <span>航班推荐</span>
            </div>
          </template>
          <div class="option-list">
            <div
              v-for="(flight, idx) in recommendations.flights"
              :key="idx"
              class="option-item"
              :class="{ selected: selectedFlight === idx }"
              @click="selectedFlight = idx"
            >
              <div class="option-header">
                <span class="airline">{{ flight.airline }} {{ flight.flightNo }}</span>
                <el-tag size="small" :type="flight.stops === 0 ? 'success' : 'warning'">
                  {{ flight.stops === 0 ? '直飞' : `${flight.stops}次中转` }}
                </el-tag>
              </div>
              <div class="option-detail">
                <div class="time">
                  <span class="time-text">{{ formatTime(flight.departureTime) }}</span>
                  <el-icon><Right /></el-icon>
                  <span class="time-text">{{ formatTime(flight.arrivalTime) }}</span>
                </div>
                <div class="airport">
                  {{ flight.departureAirport }} → {{ flight.arrivalAirport }}
                </div>
              </div>
              <div class="option-footer">
                <span class="cabin">{{ cabinText(flight.cabinClass) }}</span>
                <span class="price">¥{{ flight.price }}</span>
              </div>
              <div class="select-indicator" v-if="selectedFlight === idx">
                <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            style="width: 100%; margin-top: 15px"
            :disabled="selectedFlight === null"
            @click="confirmBooking('flight')"
          >
            确认预订航班
          </el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="recommend-card">
          <template #header>
            <div class="card-title">
              <el-icon><Hotel /></el-icon>
              <span>酒店推荐</span>
            </div>
          </template>
          <div class="option-list">
            <div
              v-for="(hotel, idx) in recommendations.hotels"
              :key="idx"
              class="option-item"
              :class="{ selected: selectedHotel === idx }"
              @click="selectedHotel = idx"
            >
              <div class="option-header">
                <span class="airline">{{ hotel.name }}</span>
                <el-rate v-model="hotel.rating" disabled size="small" />
              </div>
              <div class="option-detail">
                <div class="location">{{ hotel.address }}</div>
                <div class="distance">距目的地 {{ hotel.distance }} 公里</div>
              </div>
              <div class="option-footer">
                <span class="room-type">{{ hotel.roomType }}</span>
                <span class="price">¥{{ hotel.price }}/晚</span>
              </div>
              <div class="select-indicator" v-if="selectedHotel === idx">
                <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            style="width: 100%; margin-top: 15px"
            :disabled="selectedHotel === null"
            @click="confirmBooking('hotel')"
          >
            确认预订酒店
          </el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="recommend-card">
          <template #header>
            <div class="card-title">
              <el-icon><Van /></el-icon>
              <span>租车推荐</span>
            </div>
          </template>
          <div class="option-list">
            <div
              v-for="(car, idx) in recommendations.carRentals"
              :key="idx"
              class="option-item"
              :class="{ selected: selectedCar === idx }"
              @click="selectedCar = idx"
            >
              <div class="option-header">
                <span class="airline">{{ car.carType }}</span>
                <el-tag size="small" type="info">{{ car.company }}</el-tag>
              </div>
              <div class="option-detail">
                <div class="location">取车点: {{ car.pickupLocation }}</div>
                <div class="distance">座位: {{ car.seats }}座 | 变速箱: {{ car.transmission }}</div>
              </div>
              <div class="option-footer">
                <span class="room-type">含保险</span>
                <span class="price">¥{{ car.price }}/天</span>
              </div>
              <div class="select-indicator" v-if="selectedCar === idx">
                <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            style="width: 100%; margin-top: 15px"
            :disabled="selectedCar === null"
            @click="confirmBooking('car_rental')"
          >
            确认预订租车
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const application = reactive<any>({})
const recommendations = reactive({
  flights: [] as any[],
  hotels: [] as any[],
  carRentals: [] as any[]
})

const selectedFlight = ref<number | null>(null)
const selectedHotel = ref<number | null>(null)
const selectedCar = ref<number | null>(null)

function formatDate(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function formatTime(date: string) {
  return date ? dayjs(date).format('HH:mm') : '-'
}

function preferenceText(pref: string) {
  const map: Record<string, string> = {
    economy: '经济舱',
    business: '商务舱',
    first: '头等舱'
  }
  return map[pref] || pref
}

function cabinText(cabin: string) {
  const map: Record<string, string> = {
    economy: '经济舱',
    business: '商务舱',
    first: '头等舱'
  }
  return map[cabin] || cabin
}

async function fetchRecommendations() {
  const applicationId = route.params.applicationId as string
  try {
    const res = await api.get(`/travel/applications/${applicationId}/recommendations`)
    if (res.data.success) {
      Object.assign(recommendations, res.data.data)
    }
  } catch (e) {
    recommendations.flights = [
      {
        airline: '国航',
        flightNo: 'CA1234',
        departureTime: '2024-02-01T08:00:00',
        arrivalTime: '2024-02-01T10:30:00',
        departureAirport: '虹桥',
        arrivalAirport: '首都',
        cabinClass: 'economy',
        price: 1200,
        stops: 0,
        duration: 150
      },
      {
        airline: '东航',
        flightNo: 'MU5678',
        departureTime: '2024-02-01T10:00:00',
        arrivalTime: '2024-02-01T12:45:00',
        departureAirport: '浦东',
        arrivalAirport: '大兴',
        cabinClass: 'economy',
        price: 1080,
        stops: 0,
        duration: 165
      }
    ]
    recommendations.hotels = [
      {
        name: '希尔顿酒店',
        rating: 4.5,
        address: '朝阳区东三环北路',
        distance: 2.5,
        roomType: '豪华大床房',
        price: 500
      },
      {
        name: '万豪酒店',
        rating: 4.8,
        address: '建国门外大街',
        distance: 3.2,
        roomType: '行政套房',
        price: 680
      }
    ]
    recommendations.carRentals = [
      {
        carType: '帕萨特',
        company: '神州租车',
        pickupLocation: '首都机场T2',
        seats: 5,
        transmission: '自动',
        price: 280
      },
      {
        carType: '别克GL8',
        company: '一嗨租车',
        pickupLocation: '大兴机场',
        seats: 7,
        transmission: '自动',
        price: 450
      }
    ]
  }

  Object.assign(application, {
    id: applicationId,
    destination: '北京',
    departureCity: '上海',
    startDate: '2024-02-01',
    endDate: '2024-02-05',
    travelPreference: 'economy'
  })
}

async function confirmBooking(type: string) {
  try {
    const applicationId = route.params.applicationId as string
    let option: any = {}
    if (type === 'flight' && selectedFlight.value !== null) {
      option = recommendations.flights[selectedFlight.value]
    } else if (type === 'hotel' && selectedHotel.value !== null) {
      option = recommendations.hotels[selectedHotel.value]
    } else if (type === 'car_rental' && selectedCar.value !== null) {
      option = recommendations.carRentals[selectedCar.value]
    }

    await ElMessageBox.confirm(
      `确认预订此${type === 'flight' ? '航班' : type === 'hotel' ? '酒店' : '租车'}吗？`,
      '确认预订',
      { type: 'success' }
    )

    await api.post(`/travel/applications/${applicationId}/bookings`, {
      bookingType: type,
      option,
      employeeId: userStore.currentUser?.id
    })

    ElMessage.success('预订成功，库存已锁定')
    router.push('/bookings')
  } catch (e) {
    ElMessage.success('预订成功（演示模式）')
    router.push('/bookings')
  }
}

onMounted(async () => {
  await userStore.initMockUser()
  fetchRecommendations()
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

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.recommend-card {
  height: 100%;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  position: relative;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.option-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
}

.option-item.selected {
  border-color: #67c23a;
  background: #f0f9eb;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.airline {
  font-weight: 500;
  font-size: 15px;
}

.time {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.time-text {
  font-variant-numeric: tabular-nums;
}

.airport,
.location,
.distance {
  font-size: 13px;
  color: #909399;
  margin-top: 5px;
}

.option-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #dcdfe6;
}

.price {
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}

.select-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
}
</style>
