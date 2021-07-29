<!--
 * @Date: 2021-07-20 10:43:57
 * @LastEditors: E'vils
 * @LastEditTime: 2021-07-20 13:10:17
 * @Description:    
 * @FilePath: /test.vue
-->
<template>
  <scroll-view
    class=""
    scroll-x="false"
    scroll-y="false"
    upper-threshold="50"
    lower-threshold="50"
    scroll-top="0"
    scroll-left="0"
    refresher-enabled="false"
    :refresher-triggered="triggered"
    @refresherpulling="is"
    @scrolltoupper="is"
    @scrolltolower="is"
    @scroll="is"
  >
  </scroll-view>
</template>
<script>
export default {
  data() {},
  methods: {
    test() {},
  },
};
</script>
<style lang=""></style>
