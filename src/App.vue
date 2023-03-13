<template>
  <router-view></router-view>
</template>

<script setup>
import Store from "@/store";

// 依赖注入
Store.useProvider();
</script>

<style>
html,
body {
  background: #ffffff;
  margin: 0;
  width: 100%;
  height: 100%;
}

#app {
  width: 100%;
  height: 100%;
}
</style>