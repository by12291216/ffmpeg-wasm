<template>
  <div
    ref="abc"
    class="timeline-container"
    :style="{ width: timeLineContainer_width + 'px' }"
  >
    <!-- 顶部操作区域 -->
    <section class="top-operation-area">
      <div>
        <el-button link @click="startClip">
          <el-icon size="24" color="#333333"><Scissor /></el-icon>
        </el-button>

        <el-button link @click="removeCurrentIndexMaterail">
          <el-icon size="24" color="#333333"><Delete /></el-icon>
        </el-button>
      </div>

      <div>
        <el-button
          link
          @click="clickZoomIn"
          :style="{
            pointerEvents:
              maxFrameOfMaterial === 0 || frameWidth === maxFrameWidth
                ? 'none'
                : 'auto',
            opacity:
              maxFrameOfMaterial === 0 || frameWidth === maxFrameWidth
                ? 0.2
                : 1,
          }"
        >
          <el-icon size="24" color="#333333"><ZoomIn /></el-icon>
        </el-button>
        <el-button
          link
          @click="clickZoomOut"
          :style="{
            pointerEvents:
              maxFrameOfMaterial === 0 || frameWidth === minFrameWidth
                ? 'none'
                : 'auto',
            opacity:
              maxFrameOfMaterial === 0 || frameWidth === minFrameWidth
                ? 0.2
                : 1,
          }"
        >
          <el-icon size="24" color="#333333"><ZoomOut /></el-icon>
        </el-button>
        <el-button
          link
          @click="clickZoomFit"
          :style="{
            pointerEvents: maxFrameOfMaterial === 0 ? 'none' : 'auto',
            opacity: maxFrameOfMaterial === 0 ? 0.5 : 1,
          }"
        >
          <el-icon size="24" color="#333333"><Refresh /></el-icon>
        </el-button>
      </div>
    </section>

    <section
      style="
        width: 100%;
        height: calc(100% - 31px);
        display: flex;
        flex-direction: row;
      "
    >
      <!-- 左部操作区域 -->
      <!-- <div class="left-operation-area" :style="{ width: '37px' }"></div> -->

      <!-- 时间轴 -->
      <div
        class="timeline"
        :style="{ width: timeLine_width + 'px', position: 'relative' }"
        ref="timeLine"
        @click="selectCurrentTime"
      >
        <!-- 时间轴刻度 -->
        <div class="timescale" :style="{ width: timescale_width + 'px' }">
          <!-- 宽度占位 -->
          <div
            style="flex-shrink: 0"
            :style="{ width: timescale_placeholder_width + 'px' }"
          ></div>

          <!-- 时间轴的格子 -->
          <grid
            v-for="grid in gridBufferList"
            v-bind:key="grid"
            :frame="grid.frame"
            :width="grid.width"
            :showNumber="grid.showNumber"
          ></grid>
        </div>

        <!-- 时间轴的视频容器 -->
        <div class="video-line" :style="{ width: timescale_width + 'px' }">
          <video-item
            v-for="(item, index) in videoTrackMaterialList"
            :key="item"
            :index="index"
            :visionTrackMaterial="item"
            :frames="framesMap.get(index)"
          ></video-item>
          <!-- <Draggable
            class="wrapper"
            v-model="videoTrackMaterialList"
            tag="transition-group"
            @start="onVideoItemStart"
            @end="onVideoItemEnd"
            item-key="id"
          >
            <template #item="{ element, index }">
              <video-item
                :key="index"
                :index="index"
                :visionTrackMaterial="element"
                :frames="framesMap.get(index)"
              ></video-item>
            </template>
          </Draggable> -->
        </div>

        <!-- 时间选择指针 -->
        <div
          class="timeline-play-cursor"
          :class="{ active: hasMaterial }"
          :style="{ transform: `translate(${splitTimeLinePosition}px,0px)` }"
        >
          <div class="timeline-play-cursor-hd"></div>
          <div class="timeline-play-cursor-bd"></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  Scissor,
  Refresh,
  Delete,
  ZoomIn,
  ZoomOut,
} from "@element-plus/icons-vue";
import Store from "@/store";
import { inject, ref, onMounted, computed, watchEffect, watch } from "vue";
import Grid from "@/components/TimelineGrid.vue";
import VideoItem from "@/components/VideoItem.vue";
import Mapping from "@/map";
import { TimeLine, VideoEditor } from "@/viewmodels";
import Draggable from "vuedraggable";

// const coreHistory = inject(Store.coreHistory)
// const coreUndo = inject(Store.coreUndo)
// const coreRedo = inject(Store.coreRedo)
// const coreCanUndo = inject(Store.coreCanUndo)
// const coreCanRedo = inject(Store.coreCanRedo)
// 核心数据
const coreData = inject(Store.coreData);

//是否是视频编辑状态
const hasMaterial = inject(Store.hasMaterial);

const readFrameWorker = inject(Store.readFrameWorker);
// 视频轨道渲染数据
const videoTrackMaterialList = computed(() =>
  Mapping.getVideoTrackMaterialList(
    coreData.sections[currentSectionIndex.value - 1].sectionTimeline.visionTrack
      .visionTrackMaterials
  )
);
//当前视频片段的索引
const currentMaterialIndex = inject(Store.currentMaterialIndex);

// 帧宽度：决定了时间轴的比例
const frameWidth = inject(Store.frameWidth);

// 时间轴
const timeLine = ref(null);

//指针的偏移位置
const splitTimeLinePosition = inject(Store.splitTimeLinePosition);

//当前选择的时间（时间刻度 毫秒）
const splitTime = inject(Store.splitTime);

// timescale's grid
const gridBufferList = ref([]);

/** 依赖注入 start */
// 时间轴容器的宽度
const timeLineContainer_width = inject(Store.timeLineContainer_width);

// 时间轴滚动轴左偏移量
const timeLineOffsetLeft = inject(Store.timeLineOffsetLeft);

// 时间轴宽度：用户能看见的宽度
const timeLine_width = inject(Store.timeLine_width);

// 时间刻度总宽度：包含用户看不见的宽度
const timescale_width = inject(Store.timescale_width);

// 时间刻度左侧占位的宽度
const timescale_placeholder_width = inject(Store.timescale_placeholder_width);

// 当前格子宽度
const gridWidth = inject(Store.gridWidth);

// 格子内帧数
const gridFrame = inject(Store.gridFrame);

// 每组格子内的帧数
const groupGridFrame = inject(Store.groupGridFrame);

// 段落级焦点
const currentSectionIndex = inject(Store.currentSectionIndex);

// 最小帧宽度
const minFrameWidth = inject(Store.minFrameWidth);

// 最大帧宽度
const maxFrameWidth = inject(Store.maxFrameWidth);

// 合适帧宽度
const fitFrameWidth = inject(Store.fitFrameWidth);

// 当前素材最大帧数
const maxFrameOfMaterial = inject(Store.maxFrameOfMaterial);

// 需要加载上来的视频帧
const framesMap = inject(Store.framesMap);

const videoFrameList = inject(Store.videoFrameList);

const selectCurrentTime = (e) => {
  if (hasMaterial.value && !isClickFrame(e.path)) {
    splitTimeLinePosition.value = e.layerX + timeLineOffsetLeft.value;
  }
};

//监听选择的时间轴位置，更新当前时间
watch([splitTimeLinePosition, splitTime], () => {
  Mapping.getCurrentTime(
    splitTimeLinePosition,
    splitTime,
    gridWidth,
    gridFrame
  );
});
//监听scale变化,改变指针位置
watch([gridWidth, gridFrame], () => {
  Mapping.getCurrentTimelinePlayPosition(
    splitTimeLinePosition,
    splitTime,
    gridWidth,
    gridFrame
  );
});

/**
 * 判断点击的是否是frame
 * */
const isClickFrame = (path) => {
  let flag = false;
  for (let i = 0; i < 2; i++) {
    let className = path[i].className;
    if (
      className.indexOf("video-frame") !== -1 ||
      className.indexOf("video-item") !== -1
    ) {
      flag = true;
      break;
    }
  }
  return flag;
};

/** 依赖注入 end */

/** 点击事件 start */
// 点击放大
const clickZoomIn = () => {
  TimeLine.zoomIn(frameWidth, maxFrameWidth);
};

// 点击缩小
const clickZoomOut = () => {
  TimeLine.zoomOut(frameWidth, minFrameWidth);
};

// 点击缩放到合适
const clickZoomFit = () => {
  TimeLine.zoomFit(frameWidth, fitFrameWidth);
};
// 当前预览器加载的视频 URL
const currentVideoUrl = inject(Store.currentVideoUrl);

//删除material
const removeCurrentIndexMaterail = () => {
  console.log(currentMaterialIndex.value, 9999);
  VideoEditor.removeCurrentIndexMaterail(
    coreData,
    currentSectionIndex,
    currentMaterialIndex.value
  );
};

//切割按钮函数
const startClip = () => {
  VideoEditor.startClipOfCurrentVideo(coreData, currentSectionIndex, splitTime);
};

/** 拖拽已分段的视频帧 start */
const onVideoItemStart = (e) => {
  // console.log(e, "onVideoItemStart");
};

const onVideoItemEnd = (e) => {
  // console.log(e, "onVideoItemEnd");
  const oldIndex = e.oldIndex;
  const newIndex = e.newIndex;
  if (oldIndex != newIndex) {
    VideoEditor.dragOrderVisionTrackMaterials(
      coreData,
      currentSectionIndex,
      oldIndex,
      newIndex
    );
  }
};

/** 拖拽已分段的视频帧 end */
watchEffect(() => {
  // 渲染 gridBufferList
  Mapping.renderGridBufferList(
    gridBufferList,
    gridWidth.value,
    groupGridFrame.value,
    gridFrame.value,
    timeLineOffsetLeft.value,
    timeLine_width.value
  );
});

// 计算 timeLineOffsetLeft
onMounted(() => {
  if (timeLine.value) {
    timeLine.value.addEventListener("scroll", (event) => {
      if (event.target) {
        if (
          event.target.scrollLeft <=
          timescale_width.value - timeLine_width.value
        ) {
          // doing nothing
          timeLineOffsetLeft.value = event.target.scrollLeft;
        }
      }
    });
  } else {
    console.log("error: timeLine.value is", timeLine.value);
  }
  // console.log(coreHistory)
  // console.log(`coreUndo:${coreUndo}`)
  // console.log(`coreRedo:${coreRedo}`)
  // console.log(`coreCanUndo:${coreCanUndo.value}`)
  // console.log(`coreCanRedo:${coreCanRedo.value}`)
});
</script>

<style lang="scss" scope>
.timeline-container {
  width: 100%;
  height: 288px;
  background: #ffffff;
  border-top: 1px solid #f5f7fa;
  display: flex;
  flex-direction: column;

  .top-operation-area {
    padding: 8px;
    height: 31px;
    width: calc(100% - 16px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #f1f3f6;

    div {
      display: flex;
      align-items: center;
    }

    .top-button-left {
      width: 26px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      border-radius: 5px;
      cursor: pointer;

      &:hover {
        background: #1b1b1b;
      }
    }

    .top-button-right {
      width: 26px;
      height: 20px;
      display: flex;
      justify-self: flex-end;
      align-items: center;
      justify-content: center;
      margin-right: 8px;
      border-radius: 5px;
      cursor: pointer;

      &:hover {
        background: #1b1b1b;
      }
    }
  }

  .left-operation-area {
    background: #ffffff;
    height: 100%;
  }

  .timeline {
    width: calc(100% - 37px);
    padding-left: 10px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: scroll;
    box-shadow: inset 3px -3px 3px rgba(0, 0, 0, 0.1);

    .timescale {
      display: flex;
      flex-direction: row;
    }

    .video-line {
      margin-top: 15px;
      height: 72px;
      display: flex;
      flex-direction: row;
    }
  }
}
// 指针  start
.timeline-play-cursor {
  bottom: 0;
  left: 5px;
  position: absolute;
  top: 15px;
  width: 10px;
  z-index: 6;
}
.timeline-play-cursor.active .timeline-play-cursor-hd,
.timeline-play-cursor.active .timeline-play-cursor-hd:after {
  background-color: #ffffff;
}
.timeline-play-cursor.active .timeline-play-cursor-hd,
.timeline-play-cursor.active .timeline-play-cursor-hd:after {
  background-color: #ffffff;
}
.timeline-play-cursor-hd {
  background-color: #ffffff;
  border: 2px solid #333333;
  border-bottom: none;
  height: 12px;
  left: 0;
  position: -webkit-sticky;
  position: sticky;
  right: 0;
  top: 0;
  width: 6px;
}
.timeline-play-cursor-hd:after {
  background-color: #333333;
  border-bottom: 2px solid #333333;
  border-right: 2px solid #333333;
  bottom: 0;
  content: "";
  display: block;
  height: 5px;
  position: absolute;
  right: 0;
  -webkit-transform: rotate(45deg) translate(2.8px, 2px);
  -moz-transform: rotate(45deg) translate(2.8px, 2px);
  -o-transform: rotate(45deg) translate(2.8px, 2px);
  transform: rotate(45deg) translate(2.8px, 2px);
  width: 5px;
}
.timeline-play-cursor-bd {
  background-color: #333333;
  bottom: 0;
  left: 4px;
  position: absolute;
  top: 16px;
  -webkit-transform: translateX(0.5px);
  -moz-transform: translateX(0.5px);
  -o-transform: translateX(0.5px);
  transform: translateX(0.5px);
  width: 1px;
}
// 指针  end
</style>