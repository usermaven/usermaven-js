<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
const { $usermaven } = useNuxtApp()

onMounted(() => {
  $usermaven.track('pageview')
})

// Watch for route changes and track pageviews
watch(() => useRoute().fullPath, (newPath) => {
  $usermaven.track('pageview')
})
</script>
