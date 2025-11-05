<template>
  <div class="about">
    <h1>This is an about page</h1>

    <button @click="sendCustomEvent">Send custom event</button>
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>

<script setup>
import { useUsermaven } from '@usermaven/vue';

const usermaven = useUsermaven();

const sendCustomEvent = () => {
  usermaven.track('custom_event', {
    custom_property: 'custom value',
  });
};
</script>