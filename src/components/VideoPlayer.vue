<template>
  <div class="video-player-container">
    <video
      class="player"
      :src="currentVideoUrl ? currentVideoUrl : null"
      ref="videoPlay"
      id="videoPlay"
      controls
      controlslist="nodownload  nofullscreen noremoteplayback"
      :disablePictureInPicture="true"
    ></video>
    <!-- <img
      class="player"
      :src="playerInfo.playerImageList[playerInfo.playerIndex]"
    /> -->
    <div class="button-container">
      <!-- <span class="current-time">00:00:00:00</span>
      <span class="total-time">00:00:00:00</span> -->

      <div class="play" @click="play">
        播放<el-icon size="32"><CaretRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import Store from "@/store";
import { inject, watchEffect, ref, reactive, nextTick, onMounted } from "vue";
import Mapping from "@/map";
import { VideoEditor } from "@/viewmodels";
import { ElLoading, ElMessage } from "element-plus";
import { CaretRight } from "@element-plus/icons-vue";
// 核心数据
const coreData = inject(Store.coreData);

// 读帧的 Worker
const readFrameWorker = inject(Store.readFrameWorker);

// 临时存放视频帧的列表
const videoFrameList = inject(Store.videoFrameList);

// 段落级焦点
const currentSectionIndex = inject(Store.currentSectionIndex);

// 当前预览器加载的视频 URL
const currentVideoUrl = inject(Store.currentVideoUrl);

const playerIndex = ref(0);

// 需要加载上来的视频帧
const framesMap = inject(Store.framesMap);

const videoPlay = ref(null);

const playerInfo = ref({
  playerImageList: [],
  playerIndex: 0,
});

// const videoPlayerDom = document.getElementById("videoPlayer");
// videoPlayerDom.addEventListener("play", function () {
//   //播放
//   console.log("开始播放");
//   // playerIndex.value = 0
//   // currentVideoUrl.value = videoTrackMaterialList[]
// });
// videoPlayerDom.addEventListener("pause", function () {
//   //暂停
//   console.log("暂停");
// });
// videoPlayerDom.addEventListener(
//   "ended",
//   () => {
//     //结束
//     console.log("播放结束");
//   },
//   false
// );

const play = async () => {
  // 视频轨道渲染数据
  // const videoTrackMaterialList = Mapping.getVideoTrackMaterialList(
  //   coreData.sections[currentSectionIndex.value - 1].sectionTimeline.visionTrack
  //     .visionTrackMaterials
  // );

  // playerIndex.value = 0
  // currentVideoUrl.value = videoTrackMaterialList[0]
  VideoEditor.previewVideo(
    readFrameWorker.value,
    coreData,
    videoFrameList,
    currentVideoUrl,
    () => {
      ElLoading.service().close();
      videoPlay.value.play();
    }
  );
};

const playByReadFrame = () => {
  const frames = framesMap.value;
  const framesMapLength = framesMap.value.size;
  if (frames) {
    const imageList = [];
    for (let m = 0; m < framesMapLength; m++) {
      const frame = frames.get(m);
      for (let i = 0; i < frame.length; i++) {
        const item = frame[i];
        const blobUrl = item.blobUrl;
        imageList.push(blobUrl);
      }
    }
    playerInfo.value = {
      playerImageList: imageList,
      playerIndex: 0,
    };
  }
  const playInterval = setInterval(() => {
    playerInfo.value.playerIndex += 1;
  }, 1000);
  if (playerInfo.value.playerImageList.length == playerInfo.value.playerIndex) {
    clearInterval(playInterval);
    playerInfo.value = {
      playerImageList: [],
      playerIndex: 0,
    };
  }
};
</script>

<style lang="scss" scope>
.video-player-container {
  width: 100%;
  height: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;

  .player {
    width: 95%;
    height: calc(100% - 65px);
    background: #000000;
    margin-top: 15px;
    margin-bottom: 10px;
    flex: 1;
  }

  //全屏按钮
  video::-webkit-media-controls-fullscreen-button {
    display: none;
  }
  //播放按钮
  video::-webkit-media-controls-play-button {
    display: none;
  }
  //观看的当前时间
  video::-webkit-media-controls-current-time-display {
    display: none;
  }
  //剩余时间
  video::-webkit-media-controls-time-remaining-display {
    display: none;
  }
  //音量按钮
  video::-webkit-media-controls-mute-button {
    display: none;
  }
  video::-webkit-media-controls-toggle-closed-captions-button {
    display: none;
  }
  //音量的控制条
  video::-webkit-media-controls-volume-slider {
    display: none;
  }

  .button-container {
    height: 60px;
    width: 95%;
    display: flex;
    justify-content: flex-start;
    position: relative;

    .current-time {
      font-size: 12px;
      margin-right: 14px;
      color: #7f72e5;
    }

    .total-time {
      font-size: 12px;
      margin-right: 14px;
      color: #bbbbbb;
    }

    .play {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      left: 0;
      margin: auto;
      width: 200px;
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      color: #333333;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>