<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Home Page</h1>
    <p class="mb-4">Welcome to our Nuxt.js application with Usermaven integration!</p>
    <div class="space-x-4">
      <NuxtLink to="/about" class="text-blue-500 hover:text-blue-700">Go to About Page</NuxtLink>
      <NuxtLink to="/custom-events" class="text-blue-500 hover:text-blue-700">Custom Events</NuxtLink>
    </div>
  </div>
</template>
