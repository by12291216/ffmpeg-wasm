<template>
  <div>
    <el-dialog v-model="loadingModalVisible" :title="modalTitle" width="30%">
      <el-progress
        :text-inside="true"
        :stroke-width="26"
        :percentage="exportProgress"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { defineProps, inject, ref, watchEffect } from "vue";
import { ElMessageBox } from "element-plus";

const loadingModalVisible = inject(loadingModalVisible);

const loadingSteps = inject(loadingSteps);

const loadingStepIndex = inject(loadingStepIndex)

watchEffect(() => {
  if (loadingModalVisible.value == true) {
    // 重置当前进度条
    exportProgress.value = 0;
  }
});

watchEffect((onInvalidate)=>{
  if(loadingSteps.length > 0){
    const interval = setInterval(()=>{
      if(loadingSteps[loadingStepIndex].limit > exportProgress.value){
        exportProgress.value += 1
      }
    }, 500)
  }
})

watchEffect(()=>{
  
})

watchEffect(() => {});

const exportProgress = ref(0);

const handleClose = () => {
  loadingModalVisible.value = false;
};
</script>

<style>
</style>