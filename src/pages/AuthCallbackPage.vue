<template>
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:12px">
    <p style="color:#888;font-size:14px">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const status = ref('Completing sign-in...')

onMounted(async () => {
  const code = route.query.code as string | undefined

  if (!code) {
    status.value = 'Missing auth code. Redirecting...'
    await router.push('/login')
    return
  }

  const success = await auth.completeGoogleSignIn(code)

  if (success) {
    await router.push(auth.user?.needsOnboarding ? '/onboarding' : '/')
  } else {
    status.value = `Sign-in failed: ${auth.error ?? 'Unknown error'}`
    setTimeout(() => router.push('/login'), 2000)
  }
})
</script>
