import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'brainstorm',
        name: 'brainstorm',
        component: () => import('@/pages/BrainstormPage.vue'),
      },
      {
        path: 'research',
        name: 'research',
        component: () => import('@/pages/ResearchPage.vue'),
      },
      {
        path: 'series',
        name: 'series',
        component: () => import('@/pages/SeriesPage.vue'),
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/pages/SearchPage.vue'),
      },
      {
        path: 'workspace/:type/:sub?',
        name: 'workspace',
        component: () => import('@/pages/WorkspacePage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Synchronous guard — auth is already resolved in main.ts before the router mounts
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true)
  const isPublic = to.matched.some((record) => record.meta.public === true)

  // Route requires auth but user is not authenticated → login
  if (requiresAuth && !auth.isAuthenticated) {
    next('/login')
    return
  }

  // Public route (login) but user IS authenticated → home
  if (isPublic && auth.isAuthenticated && to.name === 'login') {
    next('/')
    return
  }

  next()
})
