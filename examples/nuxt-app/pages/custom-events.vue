<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Custom Events Demo</h1>
    
    <div class="space-y-6">
      <!-- Button Click Event -->
      <div class="p-4 border rounded">
        <h2 class="text-xl mb-2">Button Click Event</h2>
        <button 
          @click="trackButtonClick"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Click me!
        </button>
      </div>

      <!-- Form Submission Event -->
      <div class="p-4 border rounded">
        <h2 class="text-xl mb-2">Form Submission Event</h2>
        <form @submit.prevent="trackFormSubmit" class="space-y-4">
          <div>
            <label class="block mb-1">Name:</label>
            <input 
              v-model="formData.name" 
              type="text" 
              class="border p-2 w-full rounded"
            >
          </div>
          <div>
            <label class="block mb-1">Email:</label>
            <input 
              v-model="formData.email" 
              type="email" 
              class="border p-2 w-full rounded"
            >
          </div>
          <button 
            type="submit"
            class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Submit Form
          </button>
        </form>
      </div>

      <!-- Navigation -->
      <div class="mt-6">
        <NuxtLink to="/" class="text-blue-500 hover:text-blue-700">Back to Home</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { $usermaven } = useNuxtApp()

const formData = ref({
  name: '',
  email: ''
})

// Track button click event
const trackButtonClick = () => {
  $usermaven.track('button_clicked', {
    buttonName: 'demo_button',
    timestamp: new Date().toISOString()
  })
}

// Track form submission event
const trackFormSubmit = () => {
  $usermaven.track('form_submitted', {
    formName: 'demo_form',
    formData: {
      name: formData.value.name,
      emailProvided: !!formData.value.email
    }
  })
  
  // Reset form
  formData.value = {
    name: '',
    email: ''
  }
}
</script>
