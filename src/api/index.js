/* eslint-disable no-async-promise-executor */
/**
 * 获取一个视频的时长，单位微秒
 * @param {*} videoFile
 * @returns
 */
const getVideoDuration = (videoFile) =>
  new Promise((resolve, _) => {
    try {
      const url = URL.createObjectURL(videoFile);
      const tempAudio = new Audio(url);
      tempAudio.addEventListener('loadedmetadata', () => {
        console.log('getVideoDuration success', tempAudio.duration);
        resolve(tempAudio.duration * 1000000);
      });
    } catch (error) {
      console.log('getVideoDuration error', error);
      throw error;
    }
  });

/**
 * 获取一个视频的宽和高
 * @param {*} videoFile
 * @returns
 */
const getVideoHeightWidth = (videoFile) =>
  new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');

      video.preload = 'metadata';

      video.src = URL.createObjectURL(videoFile);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        console.log('getVideoHeightWidth success', {
          width: video.videoWidth,
          height: video.videoHeight,
        });
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
    } catch (error) {
      console.log('getVideoHeightWidth error', error);
      reject(error);
    }
  });

/**
 * 获取多个视频的时长，单位微秒
 * @param {*} videoFile
 * @returns
 */
const getVideoListDuration = (videoFileList) =>
  new Promise(async (resolve, reject) => {
    try {
      let totalDuration = 0;
      for (let i = 0; i < videoFileList.length; i++) {
        const videoFile = videoFileList[i];
        const duration = await getVideoDuration(videoFile);
        totalDuration += duration;
      }
      console.log('getVideoListDuration success', totalDuration);
      resolve(totalDuration * 1000000);
    } catch (error) {
      console.log('getVideoListDuration error', error);
      reject(error);
    }
  });

/**
 * 将 videoFileList 中的视频，加入到 CoreData 中去
 * @param {*} coreData
 * @param {*} videoFileList
 * @param {*} currentSectionIndex
 * @returns
 */
const addVideoToCoreData = (
  coreData,
  videoFileList,
  currentSectionIndex,
  type = ''
) =>
  new Promise(async (resolve, reject) => {
    try {
      // 准备加入 CoreData 的视频素材
      const tempVisionTrackMaterials = [];

      // 构建 tempVisionTrackMaterials
      for (let i = 0; i < videoFileList.length; i++) {
        const videoFile = videoFileList[i];

        // 当前素材的时长
        const duration = await getVideoDuration(videoFile);

        // 当前素材的 timelineIn 为 maxtimelineOut，当然如果没有前面的素材，timelineIn 为 0
        // const timelineIn =
        //   i === 0
        //     ? maxtimelineOut
        //     : tempVisionTrackMaterials[i - 1].timelineOut;

        // const timelineOut = timelineIn + duration;

        const { width, height } = await getVideoHeightWidth(
          videoFile
        );

        tempVisionTrackMaterials.push({
          type: 'video',
          width: width,
          height: height,
          duration: duration,
          // timelineIn: timelineIn,
          // timelineOut: timelineOut,
          in: 0,
          out: duration,
          url: URL.createObjectURL(videoFile),
          file: videoFile,
        });
      }

      const visionTrackMaterials =
        coreData.sections[currentSectionIndex - 1].sectionTimeline
          .visionTrack.visionTrackMaterials;

      // 将 tempVisionTrackMaterials 加入 visionTrackMaterials
      for (let i = 0; i < tempVisionTrackMaterials.length; i++) {
        if (type == 'cover') {
          // 将资源插入开头
          visionTrackMaterials.unshift(tempVisionTrackMaterials[i]);
        } else {
          visionTrackMaterials.push(tempVisionTrackMaterials[i]);
        }
      }
      // 重新计算timeline
      let currentTimeline = 0;
      const newVisionTrackMaterials = visionTrackMaterials.map(
        (d) => {
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
        currentSectionIndex - 1
      ].sectionTimeline.visionTrack.visionTrackMaterials = newVisionTrackMaterials;

      console.log('addVideoToCoreData success');
      resolve();
    } catch (error) {
      console.log('addVideoToCoreData error', error);
      reject(error);
    }
  });

export default {
  getVideoDuration,
  getVideoListDuration,
  addVideoToCoreData,
  getVideoHeightWidth,
};
