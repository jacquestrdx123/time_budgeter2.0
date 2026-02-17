<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="['toast', `toast--${toast.type}`, { 'toast--leaving': !toast.visible }]"
        @click="toastStore.dismiss(toast.id)"
      >
        <span class="toast-icon">
          <template v-if="toast.type === 'success'">&#10003;</template>
          <template v-else-if="toast.type === 'error'">&#10007;</template>
          <template v-else>&#8505;</template>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click.stop="toastStore.dismiss(toast.id)">&times;</button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { useToastStore } from '@/stores/toast'

export default {
  name: 'ToastContainer',
  setup() {
    const toastStore = useToastStore()
    return { toastStore }
  },
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  pointer-events: none;
  max-width: 400px;
  width: 100%;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 0.9rem;
  line-height: 1.4;
  pointer-events: auto;
  cursor: pointer;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast--error {
  background: rgba(220, 38, 38, 0.9);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.toast--success {
  background: rgba(22, 163, 74, 0.9);
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.toast--info {
  background: rgba(37, 99, 235, 0.9);
  border: 1px solid rgba(96, 165, 250, 0.3);
}

.toast--leaving {
  opacity: 0;
  transform: translateX(1rem);
}

.toast-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
}

.toast-message {
  flex: 1;
  font-weight: 500;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.15rem;
  line-height: 1;
  transition: color 0.15s;
}

.toast-close:hover {
  color: white;
}

/* Transition group animations */
.toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}

.toast-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(2rem);
}
</style>
