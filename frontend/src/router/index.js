import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/new',
    name: 'ProjectCreate',
    component: () => import('@/views/ProjectFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id',
    name: 'ProjectShow',
    component: () => import('@/views/ProjectShowView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id/edit',
    name: 'ProjectEdit',
    component: () => import('@/views/ProjectFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/TasksView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/create',
    name: 'TaskCreate',
    component: () => import('@/views/TaskCreateView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/:id/edit',
    name: 'TaskEdit',
    component: () => import('@/views/TaskEditView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/personal-todos',
    name: 'PersonalTodos',
    component: () => import('@/views/PersonalTodosView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/personal-todos/create',
    name: 'PersonalTodoCreate',
    component: () => import('@/views/PersonalTodoCreateView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/personal-todos/:id/edit',
    name: 'PersonalTodoEdit',
    component: () => import('@/views/PersonalTodoEditView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/planner',
    name: 'Planner',
    component: () => import('@/views/PlannerView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('@/views/TeamView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/team/members',
    name: 'TeamMembers',
    component: () => import('@/views/TeamMembersView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/shifts',
    name: 'Shifts',
    component: () => import('@/views/ShiftsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/shifts/create',
    name: 'ShiftCreate',
    component: () => import('@/views/ShiftCreateView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/shifts/:id/edit',
    name: 'ShiftEdit',
    component: () => import('@/views/ShiftEditView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/reminders',
    name: 'Reminders',
    component: () => import('@/views/RemindersView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/reminders/create',
    name: 'ReminderCreate',
    component: () => import('@/views/ReminderCreateView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/reminders/:id/edit',
    name: 'ReminderEdit',
    component: () => import('@/views/ReminderEditView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/NotificationsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications/preferences',
    name: 'NotificationPreferences',
    component: () => import('@/views/NotificationPreferencesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.meta.guest && auth.isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
