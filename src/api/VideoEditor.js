import myAxios from './axios';

export function getModules(params) {
  return myAxios({
    url: '/thcloud/api-szjy/sz/mkgl/getmoduleinfo',
    method: 'get',
    params: params,
  });
}

export function saveClipVideo(params) {
  return myAxios({
    url: '/thcloud/api-szjy/sz/spysjj/create',
    method: 'post',
    data: params,
  });
}

export function uploadMethod(params) {
  return myAxios({
    url: '/thcloud/api-oss/sysAttMain/upload',
    method: 'post',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data;charset=UTF-8',
    },
    transformRequest: [
      (data) => {
        return data;
      },
    ],
  });
}

export function uploadVideoToCourse(params) {
  return myAxios({
    url: `/thcloud/api-szjy/sz/spsc/uploadVideo/${params.id}`,
    method: 'get',
    params: params,
  });
}
