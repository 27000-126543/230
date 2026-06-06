import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/applications',
    name: 'Applications',
    component: () => import('@/views/Applications.vue')
  },
  {
    path: '/applications/create',
    name: 'CreateApplication',
    component: () => import('@/views/CreateApplication.vue')
  },
  {
    path: '/applications/:id',
    name: 'ApplicationDetail',
    component: () => import('@/views/ApplicationDetail.vue')
  },
  {
    path: '/approvals',
    name: 'Approvals',
    component: () => import('@/views/Approvals.vue')
  },
  {
    path: '/bookings',
    name: 'Bookings',
    component: () => import('@/views/Bookings.vue')
  },
  {
    path: '/bookings/:applicationId',
    name: 'BookingRecommend',
    component: () => import('@/views/BookingRecommend.vue')
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: () => import('@/views/Expenses.vue')
  },
  {
    path: '/expenses/:applicationId',
    name: 'ExpenseUpload',
    component: () => import('@/views/ExpenseUpload.vue')
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue')
  },
  {
    path: '/budget',
    name: 'Budget',
    component: () => import('@/views/Budget.vue')
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/Logs.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
