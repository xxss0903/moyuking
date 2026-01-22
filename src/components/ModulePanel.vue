<template>
  <div id="module-panel" :class="{ show: visible }" @click.self="close">
    <div id="module-content">
      <div id="module-list">
        <div
          v-for="module in availableModules"
          :key="module.id"
          class="module-option"
          :class="{ selected: module.id === currentModuleId }"
          @click="selectModule(module.id)"
        >
          <span class="module-icon">{{ module.icon }}</span>
          <div class="module-info">
            <div class="module-name">{{ module.name }}</div>
            <div class="module-desc">{{ module.description }}</div>
          </div>
          <div class="radio-indicator"></div>
        </div>
      </div>
      <button id="module-close" @click="close">确定</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  availableModules: {
    type: Array,
    default: () => []
  },
  currentModuleId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:visible', 'select-module']);

const close = () => {
  emit('update:visible', false);
};

const selectModule = (moduleId) => {
  emit('select-module', moduleId);
};
</script>

<style scoped>
#module-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
}

#module-panel.show {
  display: flex;
}

#module-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.module-option {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.module-option:hover {
  border-color: #007bff;
  background: #f0f8ff;
}

.module-option.selected {
  border-color: #007bff;
  background: #e7f3ff;
}

.module-icon {
  font-size: 24px;
  margin-right: 12px;
}

.module-info {
  flex: 1;
}

.module-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.module-desc {
  font-size: 12px;
  color: #666;
}

.radio-indicator {
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-radius: 50%;
  margin-left: 12px;
  position: relative;
}

.module-option.selected .radio-indicator {
  border-color: #007bff;
}

.module-option.selected .radio-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #007bff;
  border-radius: 50%;
}

#module-close {
  margin-top: 20px;
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

#module-close:hover {
  background: #0056b3;
}
</style>

