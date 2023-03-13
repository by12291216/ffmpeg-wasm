<template>
  <div class="container">
    <div class="search-area">
      <el-input
        v-model="moduleName"
        placeholder="请输入模板名称 "
        class="input-with-select"
      >
      </el-input>

      <el-button :icon="Search" @click="loadModules()">搜索</el-button>
      <el-button :icon="RefreshRight" @click="loadModules('clear')" />
    </div>
    <div class="module-areas">
      <div class="module-area module-add-area" @click="openAddModule()">
        <el-icon><Plus /></el-icon>
        <p>新增模板</p>
      </div>
      <div class="module-area" v-for="item in moduleList" :key="item.id">
        <el-row class="module-preview">
          <el-col :span="12">
            <p class="module-name">{{ item.moduleName }}</p>
          </el-col>
          <el-col
            :span="12"
            style="display: flex; align-items: center; justify-content: end"
          >
            <el-button link @click="selectModule(item)" style="color: #9aa5b4">
              <el-icon style="margin-right: 12px"><DocumentChecked /></el-icon
              >添加模版
            </el-button>
          </el-col>
          <el-col :span="12">
            <el-image
              style="width: 97%; height: 100px"
              :src="`${base64Str}${item.startPicture}`"
              :preview-src-list="[`${base64Str}${item.startPicture}`]"
              fit="cover"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><icon-picture /></el-icon>
                </div>
              </template>
            </el-image>
          </el-col>
          <el-col :span="12">
            <el-image
              style="width: 100%; height: 100px"
              :src="`${base64Str}${item.endPicture}`"
              :preview-src-list="[`${base64Str}${item.endPicture}`]"
              fit="cover"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><icon-picture /></el-icon>
                </div>
              </template>
            </el-image>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Search,
  RefreshRight,
  Picture as IconPicture,
  Plus,
  DocumentChecked,
} from "@element-plus/icons-vue";
import { inject, ref, onMounted } from "vue";
import Store from "@/store";
import { getModules } from "@/api/VideoEditor";
import { getFileFromBase64 } from "@/utils";
import { VideoEditor } from "@/viewmodels";

const base64Str = "data:image/png;base64,";
const moduleName = ref("");

// 核心数据
const coreData = inject(Store.coreData);

// 帧宽度：决定了时间轴的比例
const frameWidth = inject(Store.frameWidth);

// 当前预览器加载的视频 URL
const currentVideoUrl = inject(Store.currentVideoUrl);

// 合适的帧宽度
const fitFrameWidth = inject(Store.fitFrameWidth);

// 当前段落级焦点
const currentSectionIndex = inject(Store.currentSectionIndex);

// 视频选择器 input type=file
const videoInputElement = ref(null);

const moduleList = inject(Store.moduleList);

onMounted(() => {
  loadModules();
});

const loadModules = (type = "") => {
  if (type == "clear") moduleName.value = "";
  const params = moduleName.value != "" ? { moduleName: moduleName.value } : {};
  getModules(params).then((response) => {
    moduleList.value = response.result;
  });
};

const selectModule = (item) => {
  const startFile = item.startPicture
    ? getFileFromBase64(item.startPicture, "sp.png")
    : null;
  const endFile = item.endPicture
    ? getFileFromBase64(item.endPicture, "ep.png")
    : null;

  VideoEditor.addTemplateOnCurrentSection(
    [startFile, endFile],
    currentVideoUrl,
    coreData,
    frameWidth,
    fitFrameWidth,
    currentSectionIndex,
    videoInputElement
  );
};

const openAddModule = () => {
  const ORIGIN_BASE = "/thcloud/szjy";
  const url = `${origin}${ORIGIN_BASE}/#/videoClip/TemplateManage?add=1`;
  // window.open(`${origin}${ORIGIN_BASE}/#${url}?${valueString}`, '_blank')
  window.open(`${url}`, "_blank");
};
</script>

<style lang="scss" scope>
.container {
  padding: 15px 0;
  height: 100%;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;

  .el-col {
    margin-bottom: 12px;
  }

  .image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 30px;
  }
  .image-slot .el-icon {
    font-size: 30px;
  }

  .search-area {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    height: 40px;

    .el-button {
      margin-left: 12px;
    }
  }

  .module-areas {
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    height: calc(100% - 85px);

    .module-area {
      width: 49%;
      height: 178px;
      margin-bottom: 12px;

      .module-preview {
        background-color: #f1f3f6;
        padding: 4px 12px;
        height: 100%;
      }
      .module-name {
        color: #333333;
        font-size: 18px;
        margin: 8px 0;
        cursor: pointer;
      }
    }

    .module-insert:hover {
      box-shadow: 0px 1px 4px rgba(0, 21, 41, 0.12);
    }

    .module-add-area {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f3f6;
      flex-direction: column;

      cursor: pointer;

      p {
        margin: 8px 0;
      }
    }
  }
}
</style>