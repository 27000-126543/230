<template>
  <el-container class="app-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="28"><Suitcase /></el-icon>
        <span>差旅管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/applications">
          <el-icon><Tickets /></el-icon>
          <span>差旅申请</span>
        </el-menu-item>
        <el-menu-item index="/approvals">
          <el-icon><Check /></el-icon>
          <span>审批中心</span>
        </el-menu-item>
        <el-menu-item index="/bookings">
          <el-icon><Hotel /></el-icon>
          <span>预订管理</span>
        </el-menu-item>
        <el-menu-item index="/expenses">
          <el-icon><Money /></el-icon>
          <span>费用报销</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><TrendCharts /></el-icon>
          <span>报表分析</span>
        </el-menu-item>
        <el-menu-item index="/budget">
          <el-icon><Wallet /></el-icon>
          <span>预算管理</span>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Document /></el-icon>
          <span>操作日志</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="user-info">
          <el-avatar :size="32" :icon="UserFilled" />
          <span class="username">{{ currentUser?.name || '员工' }}</span>
          <el-tag size="small" type="success">{{ roleText }}</el-tag>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import { UserFilled } from '@element-plus/icons-vue'

const route = useRoute()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const currentUser = computed(() => userStore.currentUser)
const roleText = computed(() => userStore.roleText)

onMounted(async () => {
  await userStore.initMockUser()
  await userStore.loadDepartments()
})
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  background-color: #2b2f3a;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-size: 14px;
  color: #303133;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
