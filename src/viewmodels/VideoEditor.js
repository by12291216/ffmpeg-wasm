import Api from "@/api";
import WASM from "@/wasm";
import FFmpeg from "@ffmpeg/ffmpeg";
import utils, { getFileType } from "@/utils";
import { ElLoading, ElMessage } from "element-plus";
import myAxios from "@/api/axios";
import {
  uploadMethod,
  saveClipVideo,
  uploadVideoToCourse,
} from "@/api/VideoEditor";
import Cookies from "js-cookie";
import { nextTick } from "vue";

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
  log: true,
  corePath: new URL("ffmpeg-core.js", document.location).href,
});
const initFFmpeg = async () => {
  if (!ffmpeg.isLoaded()) {
    console.log("initFFmpeg");
    await ffmpeg.load();
  }
};
// 默认ffmpeg缓存 生成视频文件名称
const defaultFileName = "download.mp4";
/**
 * 上传 VideoList
 * @param {*} videoList
 * @param {*} currentVideoUrl
 * @param {*} coreData
 * @param {*} frameWidth
 * @param {*} fitFrameWidth
 */
const addUploadOnCurrentSection = async (
  fileList,
  currentVideoUrl,
  coreData,
  frameWidth,
  fitFrameWidth,
  currentSectionIndex,
  videoInputElement
) => {
  const loading = ElLoading.service({
    lock: true,
    text: "上传文件转换中，请稍后...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  let file = fileList[0];
  const fileType = getFileType(file.name);
  switch (fileType) {
    case "image": {
      ffmpeg.FS("writeFile", `tmp.png`, await fetchFile(file));

      await ffmpeg.run(
        "-loop",
        "1",
        "-r",
        "100",
        "-f",
        "image2",
        "-i",
        "tmp.png",
        "-t",
        "5",
        "video.mp4"
      );
      const data = ffmpeg.FS("readFile", "video.mp4");
      const imgVideo = new Blob([data.buffer], {
        type: "video/mp4",
        name: "图片转视频.mp4",
      });
      file = new File([imgVideo], new Date().getTime() + ".png");
    }
  }

  currentVideoUrl.value = URL.createObjectURL(file);

  await Api.addVideoToCoreData(coreData, [file], currentSectionIndex.value);

  frameWidth.value = fitFrameWidth.value;
  if (videoInputElement.value) videoInputElement.value.value = null;

  loading.close();
};

const addTemplateOnCurrentSection = async (
  fileList,
  currentVideoUrl,
  coreData,
  frameWidth,
  fitFrameWidth,
  currentSectionIndex,
  videoInputElement
) => {
  const loading = ElLoading.service({
    lock: true,
    text: "上传模板转换中，请稍后...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  let startFile = fileList[0];
  if (startFile) {
    ffmpeg.FS("writeFile", `tmp.png`, await fetchFile(startFile));

    await ffmpeg.run(
      "-loop",
      "1",
      "-r",
      "100",
      "-f",
      "image2",
      "-i",
      "tmp.png",
      "-t",
      "5",
      "video.mp4"
    );
    const data = ffmpeg.FS("readFile", "video.mp4");
    const imgVideo = new Blob([data.buffer], {
      type: "video/mp4",
      name: "图片转视频.mp4",
    });
    startFile = new File([imgVideo], new Date().getTime() + ".png");

    await Api.addVideoToCoreData(
      coreData,
      [startFile],
      currentSectionIndex.value,
      "cover"
    );
  }

  let endFile = fileList[1];
  if (endFile) {
    ffmpeg.FS("writeFile", `tmp.png`, await fetchFile(endFile));

    await ffmpeg.run(
      "-loop",
      "1",
      "-r",
      "100",
      "-f",
      "image2",
      "-i",
      "tmp.png",
      "-t",
      "5",
      "video.mp4"
    );
    const data = ffmpeg.FS("readFile", "video.mp4");
    const imgVideo = new Blob([data.buffer], {
      type: "video/mp4",
      name: "图片转视频.mp4",
    });
    endFile = new File([imgVideo], new Date().getTime() + ".png");

    await Api.addVideoToCoreData(
      coreData,
      [endFile],
      currentSectionIndex.value
    );
  }

  frameWidth.value = fitFrameWidth.value;

  loading.close();
};

const clearVideoOfCurrentSection = async (
  currentVideoUrl,
  coreData,
  currentSectionIndex,
  frameWidth,
  fitFrameWidth,
  splitTimeLinePosition
) => {
  // 清空当前的 currentVideoUrl
  currentVideoUrl.value = null;

  // 清空当前的 coreDaata
  coreData.sections[
    currentSectionIndex.value - 1
  ].sectionTimeline.visionTrack.visionTrackMaterials = [];

  frameWidth.value = fitFrameWidth.value;
  splitTimeLinePosition.value = 0;
};

/**
 * 开始裁剪视频
 * *  单位毫秒，同步函数解码完成即退出
 * @param {*} coreData 核心数据
 * @param {*} currentSectionIndex  当前section索引
 * @param {*} splitTime  时间分割线位置
 * */
const startClipOfCurrentVideo = async (
  coreData,
  currentSectionIndex,
  splitTime
) => {
  const currentClipVisionTrackMaterials =
    coreData.sections[currentSectionIndex.value - 1].sectionTimeline.visionTrack
      .visionTrackMaterials;
  const times = splitTime.value * 1000;
  const materialIdx = getCurrentClipVisionTrackMaterialsIndex(
    times,
    currentClipVisionTrackMaterials
  );
  if (materialIdx !== -1) {
    /**
     * 剪辑调整
     * 根据当前的剪切点 在跟当前部分的timeLineOut对比 获取一个相对的右段时长
     * 当前部分的out - 右段时长 = 左段视频的out和右段视频的in
     * 修复剪辑 删除 拖拽导致视频时间错误的问题
     */
    // 分割线右侧视频的时长
    const durationRight =
      currentClipVisionTrackMaterials[materialIdx].timelineOut - times;
    // 左段视频的out和右段视频的in
    const middlePoint =
      currentClipVisionTrackMaterials[materialIdx].out - durationRight;
    // 分割线左侧视频的时长
    const durationLeft =
      middlePoint - currentClipVisionTrackMaterials[materialIdx].in;
    //区间内才做切割
    const splitMaterialArr = [
      {
        ...currentClipVisionTrackMaterials[materialIdx],
        // timelineOut: times,
        out: middlePoint,
        duration: durationLeft,
      },
      {
        ...currentClipVisionTrackMaterials[materialIdx],
        // timelineIn: times,
        duration: durationRight,
        in: middlePoint,
        out: currentClipVisionTrackMaterials[materialIdx].out,
      },
    ];
    splitMaterialArr.forEach((material, idx) => {
      const tFlag = idx === 0 ? 1 : 0;
      currentClipVisionTrackMaterials.splice(
        materialIdx + idx,
        tFlag,
        material
      );
    });
    let currentTimeline = 0;
    const newVisionTrackMaterials = currentClipVisionTrackMaterials.map(
      (d, index) => {
        const timelineIn = currentTimeline;
        const timelineOut = currentTimeline + d.duration;
        currentTimeline += d.duration;
        return {
          ...d,
          timelineIn: timelineIn,
          timelineOut: timelineOut,
        };
      }
    );
    coreData.sections[
      currentSectionIndex.value - 1
    ].sectionTimeline.visionTrack.visionTrackMaterials = newVisionTrackMaterials;
  } else {
    //区间外不做切割
    console.log("没有切割的时间点");
  }
};

/**
 * 拖拽调整视频顺序
 * @param {*} coreData 核心数据
 * @param {*} currentSectionIndex  当前section索引
 * @param {*} oldIndex  旧位置
 * @param {*} newIndex  新位置
 * */
const dragOrderVisionTrackMaterials = async (
  coreData,
  currentSectionIndex,
  oldIndex,
  newIndex
) => {
  const currentVisionTrackMaterials =
    coreData.sections[currentSectionIndex.value - 1].sectionTimeline.visionTrack
      .visionTrackMaterials;
  let newArray = Object.assign([], currentVisionTrackMaterials);
  delete newArray[oldIndex];
  if (newIndex < oldIndex) {
    newArray.splice(newIndex, 0, currentVisionTrackMaterials[oldIndex]);
  } else {
    newArray.splice(newIndex + 1, 0, currentVisionTrackMaterials[oldIndex]);
  }
  const resultArray = newArray.filter((d) => {
    return d != undefined;
  });
  let currentTimeline = 0;
  const newVisionTrackMaterials = resultArray.map((d, index) => {
    const timelineIn = currentTimeline;
    const timelineOut = currentTimeline + d.duration;
    currentTimeline += d.duration;
    return {
      ...d,
      timelineIn: timelineIn,
      timelineOut: timelineOut,
    };
  });
  coreData.sections[
    currentSectionIndex.value - 1
  ].sectionTimeline.visionTrack.visionTrackMaterials = newVisionTrackMaterials;
};

/**
 * 删除视频材料片段
 * @param {*} coreData 核心数据
 * @param {*} currentSectionIndex  当前section索引
 * @param {*} currentMaterialIndex  视频材料选中索引
 * */
const removeCurrentIndexMaterail = async (
  coreData,
  currentSectionIndex,
  currentMaterialIndex
) => {
  if (currentMaterialIndex !== -1) {
    const currentVisionTrackMaterials =
      coreData.sections[currentSectionIndex.value - 1].sectionTimeline
        .visionTrack.visionTrackMaterials;
    currentVisionTrackMaterials.splice(currentMaterialIndex, 1);
    let currentTimeline = 0;
    const newVisionTrackMaterials = currentVisionTrackMaterials.map(
      (d, index) => {
        const timelineIn = currentTimeline;
        const timelineOut = currentTimeline + d.duration;
        currentTimeline += d.duration;
        return {
          ...d,

          timelineIn: timelineIn,
          timelineOut: timelineOut,
        };
      }
    );
    coreData.sections[
      currentSectionIndex.value - 1
    ].sectionTimeline.visionTrack.visionTrackMaterials = newVisionTrackMaterials;
  } else {
    console.log("没有选中视频材料");
  }
};

const pushTemplateVisionTrackMaterials = (coreData, currentSectionIndex) => {
  const currentVisionTrackMaterials =
    coreData.sections[currentSectionIndex.value - 1].sectionTimeline.visionTrack
      .visionTrackMaterials;
};

/**
 * 判断分割线在哪段视频内
 * @param {*} splitTime 时间分割线位置（时间）
 * @param {*} visionTrackMaterials  视频集
 * @returns 索引
 */
const getCurrentClipVisionTrackMaterialsIndex = (
  splitTime,
  visionTrackMaterials
) => {
  return visionTrackMaterials.findIndex((materials) => {
    return (
      splitTime > materials.timelineIn && splitTime < materials.timelineOut
    );
  });
};

/**
 * 预判视频
 * 创建视频文件 写入缓存
 * @param {*} readFrameWorker
 * @param {*} coreData
 * @param {*} videoFrameList
 */
const previewVideo = async (
  readFrameWorker,
  coreData,
  videoFrameList,
  currentVideoUrl,
  callback
) => {
  ElLoading.service({
    lock: true,
    text: "预览文件中，请稍后...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  confirmVideos(readFrameWorker.value, coreData, videoFrameList);
  setTimeout(() => {
    ffmpegVideo(
      readFrameWorker.value,
      coreData,
      videoFrameList,
      callback,
      currentVideoUrl
    );
  }, 1000);
};

/**
 * 创建视频文件 写入缓存
 * @param {*} readFrameWorker
 * @param {*} coreData
 * @param {*} videoFrameList
 */
const createVideo = async (
  readFrameWorker,
  coreData,
  videoFrameList,
  callback
) => {
  ElLoading.service({
    lock: true,
    text: "生成文件中，请稍后...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  confirmVideos(readFrameWorker.value, coreData, videoFrameList);
  setTimeout(() => {
    ffmpegVideo(readFrameWorker.value, coreData, videoFrameList, callback);
  }, 1000);
};

/**
 * 确认视频剪辑 写入ffmpeg缓存
 * @param {*} readFrameWorker
 * @param {*} coreData
 * @param {*} videoFrameList
 */
const confirmVideos = async (readFrameWorker, coreData, videoFrameList) => {
  const fileList =
    coreData.sections[0].sectionTimeline.visionTrack.visionTrackMaterials;
  const fileIndexs = [];
  for (let i = 0; i < fileList.length; i++) {
    let fileObj = await fetchFile(fileList[i].file);
    let fileName = i < 10 ? `0${i}` : i;
    fileIndexs.push(`${fileName}`);
    ffmpeg.FS("writeFile", `source${fileName}.mp4`, fileObj);
  }
};

/**
 * 开始使用ffmpeg处理剪辑视频
 * @param {*} readFrameWorker
 * @param {*} coreData
 * @param {*} videoFrameList
 * */
const ffmpegVideo = async (
  readFrameWorker,
  coreData,
  videoFrameList,
  callback,
  currentVideoUrl
) => {
  const fileList =
    coreData.sections[0].sectionTimeline.visionTrack.visionTrackMaterials;
  const fileIndexs = [];
  for (let i = 0; i < fileList.length; i++) {
    const durationIn = fileList[i].in;
    const durationOut = fileList[i].out;
    const beginTime = utils.setBackLogTime(durationIn);
    const endTime = utils.setBackLogTime(durationOut);
    let fileIndex = i < 10 ? `0${i}` : i;
    fileIndexs.push(fileIndex);
    const lineTime = ["-ss", beginTime, "-to", endTime]; //
    await ffmpeg.run(
      "-i",
      `source${fileIndex}.mp4`,
      ...lineTime,
      "-c",
      "copy",
      "-bsf:v",
      "h264_mp4toannexb",
      "-f",
      "mpegts",
      `source${fileIndex}.ts`
    );
  }

  if (fileList.length > 0) {
    const sourceList = fileIndexs.map((d) => {
      return `source${d}.ts`;
    });
    await ffmpeg.run(
      "-i",
      `concat:${sourceList.join("|")}`,
      "-c",
      "copy",
      "-bsf:a",
      "aac_adtstoasc",
      "-movflags",
      "+faststart",
      defaultFileName
    );
  }

  if (currentVideoUrl == null) {
    saveVideo(readFrameWorker, coreData, videoFrameList, callback);
  } else {
    const content = ffmpeg.FS("readFile", defaultFileName);
    const courseName =
      `${Cookies.get("courseName")}-第${Cookies.get(
        "fj"
      )}集-${new Date().valueOf()}.mp4` || defaultFileName;
    const file = new File([content], `${courseName}`, { type: "video/mp4" });
    const url = URL.createObjectURL(file);
    currentVideoUrl.value = url;
    nextTick(callback);
  }
};

// 保存视频文件并生成剪辑记录
const saveVideo = async (
  readFrameWorker,
  coreData,
  videoFrameList,
  callback
) => {
  const content = ffmpeg.FS("readFile", defaultFileName);
  const courseName =
    `${Cookies.get("courseName")}-第${Cookies.get(
      "fj"
    )}集-${new Date().valueOf()}.mp4` || defaultFileName;
  const file = new File([content], `${courseName}`, { type: "video/mp4" });

  let formdata = new FormData();
  formdata.append("file", file);
  formdata.append("moduleId", "-1");
  formdata.append("moduleBean", "clipVideo");
  formdata.append("moduleKey", "clipVideo");
  formdata.append("saveType", "2");

  let fileResponse = await uploadMethod(formdata);
  if (fileResponse) {
    console.log(fileResponse, "fileResponse");
    const fileId = fileResponse.result.id;
    const courseId = Cookies.get("courseId");
    const fj = Cookies.get("fj");
    let response = await saveClipVideo({
      courseId,
      fj,
      sysAttMainVo: {
        sysAttMainIds: [fileId],
        pageMark: "1",
        moduleKey: "clipVideo",
      },
    });
    if (response.code == "200") {
      Cookies.set("cuttingId", response?.result?.id);

      if (callback) callback(readFrameWorker, coreData, videoFrameList);
    } else {
      ElMessage.error(response.message);
    }
  }
  ElLoading.service().close();
};

const checkVideo = () => {
  const id = Cookies.get("cuttingId");
  if (id) {
    return true;
  } else {
    return false;
  }
};

// 上传视频替换课程中心中的文件
const uploadVideo = async (readFrameWorker, coreData, videoFrameList) => {
  const checkFlag = checkVideo(defaultFileName);
  if (checkFlag) {
    ElLoading.service({
      lock: true,
      text: "上传视频中，请稍后...",
      background: "rgba(0, 0, 0, 0.7)",
    });
    const id = Cookies.get("cuttingId");
    let response = await uploadVideoToCourse({ id });
    if (response.code != "200") {
      ElMessage.error(response.message);
    } else {
      ElMessage.success("上传成功");
    }
    ElLoading.service().close();
  } else {
    createVideo(readFrameWorker, coreData, videoFrameList, uploadVideo);
  }
};

const downloadVideo = async (readFrameWorker, coreData, videoFrameList) => {
  const checkFlag = checkVideo(defaultFileName);
  if (checkFlag) {
    ElLoading.service({
      lock: true,
      text: "导出视频中，请稍后...",
      background: "rgba(0, 0, 0, 0.7)",
    });
    fileDownload();
  } else {
    createVideo(readFrameWorker, coreData, videoFrameList, downloadVideo);
  }
};

// 通过文件名将MEMFS文件保存到本地
const fileDownload = () => {
  const mime = "application/octet-stream";
  const content = ffmpeg.FS("readFile", defaultFileName);
  const courseName =
    `${Cookies.get("courseName")}-第${Cookies.get(
      "fj"
    )}集-${new Date().valueOf()}.mp4` || defaultFileName;
  // console.log(`Offering download of "${filename}", with ${content.length} bytes...`)
  var a = document.createElement("a");
  a.download = courseName;
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    ElLoading.service().close();
  }, 2000);
  // ffmpeg.FS("unlink", filename);
};

export default {
  addUploadOnCurrentSection,
  addTemplateOnCurrentSection,
  clearVideoOfCurrentSection,
  startClipOfCurrentVideo,
  removeCurrentIndexMaterail,
  ffmpegVideo,
  initFFmpeg,
  confirmVideos,
  fileDownload,
  saveVideo,
  uploadVideo,
  createVideo,
  previewVideo,
  dragOrderVisionTrackMaterials,
};
