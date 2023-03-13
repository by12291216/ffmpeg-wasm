<template>
  <div class="video-editor-container">
    <div class="header-section">
      <span class="header-title" >视频剪辑</span>
    </div>
    <!-- 顶部按钮 -->
    <section class="controller-section">
      <div class="button-container">
        <div class="left-btns">
          <el-button
            style="position: relative"
            color="#BD122C"
            @change="addUploadOnCurrentSection($event)"
          >
            <input
              type="file"
              style="width: 100%; height: 100%; opacity: 0; position: absolute"
              ref="videoInputElement"
            />上传素材</el-button
          >
          <el-button @click="clearVideo">清空</el-button>
          <!-- <el-button>合成</el-button> -->
        </div>
        <div class="right-btns">
          <el-button @click="ffmpegVideo">生成</el-button>
          <el-button @click="uploadVideo">上传</el-button>
          <el-button color="#BD122C" @click="downloadVideo">导出</el-button>
        </div>
        <!-- <div class="button">
          <input
            type="file"
            style="width: 100%; height: 100%; opacity: 0; position: absolute"
            ref="videoInputElement"
          />上传文件
        </div> -->
        <!-- <div class="button">
          <input
            type="file"
            style="width: 100%; height: 100%; opacity: 0; position: absolute"
            ref="videoInputElement"
            @change="addTemplateOnCurrentSection($event)"
          />添加模板
        </div> -->
      </div>

      <!-- <div class="button-container">
        <div class="button">上传音乐</div>
        <div class="button">清空音乐</div>
      </div>

      <div class="button-container">
        <div class="button">上传配音</div>
        <div class="button">清空配音</div>
      </div> -->
    </section>
    <!-- <div style="width: 100%; flex: 1"> -->
    <el-row style="width: 100%; padding-left: 24px; flex: 1; height: 0">
      <el-col :span="10" style="height: 100%">
        <template-select></template-select>
      </el-col>
      <el-col :span="14" style="height: 100%">
        <video-player></video-player>
      </el-col>
    </el-row>
    <!-- </div> -->

    <!-- 底部时间轴 -->
    <time-line></time-line>
  </div>
</template>

<script setup>
import TemplateSelect from "@/components/TemplateSelect.vue";
import VideoPlayer from "@/components/VideoPlayer.vue";
import TimeLine from "@/components/TimeLine.vue";
import Store from "@/store";
import { inject, computed, ref, onMounted, nextTick } from "vue";
import Mapping from "@/map";
import Api from "@/api";
import { VideoEditor } from "@/viewmodels";
import WASM from "@/wasm";
import { fetchFile } from "@ffmpeg/ffmpeg";
import { checkFileType, getFileFromUrl } from "@/utils";
import { ElLoading, ElMessage } from "element-plus";
import images from "@/assets/images";
import Cookies from "js-cookie";

// 核心数据
const coreData = inject(Store.coreData);

// 时间轴的宽度
const timeLineContainer_width = inject(Store.timeLineContainer_width);

// 时间轴滚动轴左偏移量
const timeLineOffsetLeft = inject(Store.timeLineOffsetLeft);

// 帧宽度：决定了时间轴的比例
const frameWidth = inject(Store.frameWidth);

// 当前格子宽度
const gridWidth = inject(Store.gridWidth);

// 格子内帧数
const gridFrame = inject(Store.gridFrame);

// 每组格子内的帧数
const groupGridFrame = inject(Store.groupGridFrame);

// 时间轴宽度：用户能看见的宽度
const timeLine_width = inject(Store.timeLine_width);

// 时间刻度总宽度：包含用户看不见的宽度
const timescale_width = inject(Store.timescale_width);

// 当前预览器加载的视频 URL
const currentVideoUrl = inject(Store.currentVideoUrl);

// 素材的最大帧数
const maxFrameOfMaterial = inject(Store.maxFrameOfMaterial);

// 最大帧宽度
const maxFrameWidth = inject(Store.maxFrameWidth);

// 最小帧宽度
const minFrameWidth = inject(Store.minFrameWidth);

// 合适的帧宽度
const fitFrameWidth = inject(Store.fitFrameWidth);

// 当前段落级焦点
const currentSectionIndex = inject(Store.currentSectionIndex);

// 视频选择器 input type=file
const videoInputElement = ref(null);

// 读帧的 Worker
const readFrameWorker = inject(Store.readFrameWorker);

// 临时存放视频帧的列表
const videoFrameList = inject(Store.videoFrameList);

// 时间分割线位置
const splitTimeLinePosition = inject(Store.splitTimeLinePosition);

const currentFile = inject(Store.currentFile);

const moduleList = inject(Store.moduleList);

onMounted(() => {
  VideoEditor.initFFmpeg();

  nextTick(() => {
    // let id = this.$route.query.id;
    loadFile();
  });
});

const loadFile = () => {
  const loading = ElLoading.service({
    lock: true,
    text: "加载课程中，请稍后...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  const fileUrl = Cookies.get("spUrl");
  getFileFromUrl(fileUrl, "source.mp4").then((file) => {
    // 后续添加判断ffmpeg是否初始化完成
    VideoEditor.addUploadOnCurrentSection(
      [file],
      currentVideoUrl,
      coreData,
      frameWidth,
      fitFrameWidth,
      currentSectionIndex,
      videoInputElement
    );

    currentFile.value = file;

    ElLoading.service().close();
  });
};

// 视频上传 Callback
const addUploadOnCurrentSection = (e) => {
  if (checkFileType(e.target.files[0].name)) {
    VideoEditor.addUploadOnCurrentSection(
      e.target.files,
      currentVideoUrl,
      coreData,
      frameWidth,
      fitFrameWidth,
      currentSectionIndex,
      videoInputElement
    );

    currentFile.value = e.target.files[0];
  } else {
    ElMessage.error("当前文件不支持，请上传mp4或png格式的文件");
  }
};

const addTemplateOnCurrentSection = (e) => {
  if (checkFileType(e.target.files[0].name)) {
    VideoEditor.addTemplateOnCurrentSection(
      e.target.files,
      currentVideoUrl,
      coreData,
      frameWidth,
      fitFrameWidth,
      currentSectionIndex,
      videoInputElement
    );

    currentFile.value = e.target.files[0];
  } else {
    ElMessage.error("当前文件不支持，请上传png格式的文件");
  }
};

const ffmpegVideo = () => {
  VideoEditor.createVideo(readFrameWorker.value, coreData, videoFrameList);
};

const uploadVideo = () => {
  VideoEditor.uploadVideo(readFrameWorker.value, coreData, videoFrameList);
};

const downloadVideo = () => {
  VideoEditor.fileDownload(readFrameWorker.value, coreData, videoFrameList);
};

// 清空当前预览器的视频
const clearVideo = () => {
  VideoEditor.clearVideoOfCurrentSection(
    currentVideoUrl,
    coreData,
    currentSectionIndex,
    frameWidth,
    fitFrameWidth,
    splitTimeLinePosition
  );

  setTimeout(() => {
    loadFile();
  }, 500);
};

// 初始化：时间轴组件的宽度
timeLineContainer_width.value = Mapping.calcTimeLineContainerWidth(
  document.body.clientWidth
);

// 动态监听：窗口变化 -> 时间轴组件的宽度
window.onresize = () =>
  (() => {
    timeLineContainer_width.value = Mapping.calcTimeLineContainerWidth(
      document.body.clientWidth
    );
  })();
</script>

<style lang="scss" scope>
.info-container {
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  color: #efefef;
  font-size: 14px;

  .title {
    font-weight: bold;
    margin: 15px;
  }

  div {
    margin: 10px;
  }
}

.video-editor-container {
  height: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-section {
  background-image: url("~@/assets/images/bg-banner@2x.png");
  height: 60px;
  width: 100%;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;

  .header-title {
    margin-left: 20px;
    font-size: 26px;
    color: #ffffff;
  }
}

.controller-section {
  padding: 0 24px;
  height: 80px;
  width: calc(100% - 48px);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e9ef;
}

.button-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
  position: relative;

  .button {
    position: relative;
    width: 80px;
    height: 27px;
    background: #ffffff;
    color: #333333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    input {
      cursor: pointer;
    }
  }
}
</style>