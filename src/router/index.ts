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
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/pages/AuthCallbackPage.vue'),
    meta: { public: true },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { requiresAuth: true, onboarding: true },
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
        path: 'notebook',
        name: 'notebook',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/research/:researchId',
        name: 'notebook-research-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/brainstorm/:brainstormId',
        name: 'notebook-brainstorm-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/agenda/:agendaId',
        name: 'notebook-agenda-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/devotional/:devotionalId',
        name: 'notebook-devotional-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/blog/:blogId',
        name: 'notebook-blog-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/youtube/:youtubeId',
        name: 'notebook-youtube-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/small-group/:smallGroupId',
        name: 'notebook-small-group-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/church-social/:churchSocialId',
        name: 'notebook-church-social-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/social-calendar/:calendarId',
        name: 'notebook-social-calendar-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/church-email/:churchEmailId',
        name: 'notebook-church-email-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/announcement/:announcementId',
        name: 'notebook-announcement-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/church-letter/:churchLetterId',
        name: 'notebook-church-letter-detail',
        component: () => import('@/pages/NotebookPage.vue'),
      },
      {
        path: 'notebook/:id',
        name: 'notebook-detail',
        component: () => import('@/pages/NotebookPage.vue'),
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
        path: 'series/create-quick',
        name: 'series-create-quick',
        component: () => import('@/pages/CreateSeriesPage.vue'),
      },
      {
        path: 'sermons',
        name: 'sermons',
        component: () => import('@/pages/SermonsPage.vue'),
      },
      {
        path: 'sermons/:action/:mode/:seriesId?',
        name: 'sermon-flow',
        component: () => import('@/pages/SermonFlowPage.vue'),
        meta: { hideSidebar: true },
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
      {
        path: 'feedback',
        name: 'feedback-selector',
        component: () => import('@/pages/FeedbackPage.vue'),
      },
      {
        path: 'feedback/feedback',
        name: 'feedback',
        component: () => import('@/pages/FeedbackPage.vue'),
      },
      {
        path: 'feedback/bug-report',
        name: 'feedback-bug-report',
        component: () => import('@/pages/FeedbackPage.vue'),
      },
      {
        path: 'feedback/feature-request',
        name: 'feedback-feature-request',
        component: () => import('@/pages/FeedbackPage.vue'),
      },
      {
        path: 'upgrade',
        name: 'upgrade',
        component: () => import('@/pages/UpgradePage.vue'),
      },
      {
        path: 'billing/success',
        name: 'billing-success',
        component: () => import('@/pages/BillingSuccessPage.vue'),
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/pages/AdminPage.vue'),
        meta: { adminOnly: true },
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
  const isOnboarding = to.matched.some((record) => record.meta.onboarding === true)
  const isAdminOnly = to.matched.some((record) => record.meta.adminOnly === true)

  // Route requires auth but user is not authenticated → login
  if (requiresAuth && !auth.isAuthenticated) {
    next('/login')
    return
  }

  // Public route (login) but user IS authenticated
  if (isPublic && auth.isAuthenticated && to.name === 'login') {
    // If they need onboarding, go there; otherwise home
    if (auth.user?.needsOnboarding) {
      next('/onboarding')
    } else {
      next('/')
    }
    return
  }

  // Authenticated user who needs onboarding — force to onboarding unless already there
  if (auth.isAuthenticated && auth.user?.needsOnboarding && !isOnboarding) {
    next('/onboarding')
    return
  }

  // Authenticated user who does NOT need onboarding — don't let them back into onboarding
  if (auth.isAuthenticated && !auth.user?.needsOnboarding && isOnboarding) {
    next('/')
    return
  }

  if (isAdminOnly) {
    const email = (auth.user?.email ?? '').toLowerCase()
    if (email !== 'arnold@lifecity.ph') {
      next('/')
      return
    }
  }

  next()
})
