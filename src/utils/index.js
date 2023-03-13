const setDateTimePrefix = (dateTime) => {
  return dateTime < 10 ? `0${dateTime}` : `${dateTime}`;
};
//  传进来是 微秒
const setBackLogTime = (us) => {
  if (!us) return "00:00:00.0";
  // 微秒 转为  毫秒
  const mss = Math.floor(us / 1000);
  if (!mss) return "00:00:00.0";
  const days = Math.floor(mss / (1000 * 60 * 60 * 24));
  const hours = Math.floor((mss % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((mss % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((mss % (1000 * 60)) / 1000);
  const ms = (mss % (1000 * 60)) % 1000;
  const res =
    setDateTimePrefix(hours) +
    ":" +
    setDateTimePrefix(minutes) +
    ":" +
    setDateTimePrefix(seconds) +
    "." +
    ms;
  return days ? days + "day " + res : res;
};

export function checkFileType(fileName) {
  let suffix = ""; // 后缀获取
  let result = ""; // 获取类型结果
  if (fileName) {
    const flieArr = fileName.split("."); // 根据.分割数组
    suffix = flieArr[flieArr.length - 1]; // 取最后一个
  }
  if (!suffix) return false; // fileName无后缀返回false
  suffix = suffix.toLocaleLowerCase(); // 将后缀所有字母改为小写方便操作
  const whiteList = ["png", "mp4"]; // 图片格式
  result = whiteList.find((item) => item === suffix);
  if (result) {
    return true;
  } else {
    return false;
  }
}

/* 根据后缀判断文件类型 */
export function getFileType(fileName) {
  let suffix = ""; // 后缀获取
  let result = ""; // 获取类型结果
  if (fileName) {
    const flieArr = fileName.split("."); // 根据.分割数组
    suffix = flieArr[flieArr.length - 1]; // 取最后一个
  }
  if (!suffix) return false; // fileName无后缀返回false
  suffix = suffix.toLocaleLowerCase(); // 将后缀所有字母改为小写方便操作
  // 匹配图片
  const imgList = ["png", "jpg", "jpeg", "bmp", "gif"]; // 图片格式
  result = imgList.find((item) => item === suffix);
  if (result) return "image";
  // 匹配txt
  const txtList = ["txt"];
  result = txtList.find((item) => item === suffix);
  if (result) return "txt";
  // 匹配excel
  const excelList = ["xls", "xlsx"];
  result = excelList.find((item) => item === suffix);
  if (result) return "excel";
  // 匹配word
  const wordList = ["doc", "docx"];
  result = wordList.find((item) => item === suffix);
  if (result) return "word";
  // 匹配pdf
  const pdfList = ["pdf"];
  result = pdfList.find((item) => item === suffix);
  if (result) return "pdf";
  // 匹配ppt
  const pptList = ["ppt", "pptx"];
  result = pptList.find((item) => item === suffix);
  if (result) return "ppt";
  // 匹配zip
  const zipList = ["rar", "zip", "7z"];
  result = zipList.find((item) => item === suffix);
  if (result) return "zip";
  // 匹配视频
  const videoList = [
    "mp4",
    "m2v",
    "mkv",
    "rmvb",
    "wmv",
    "avi",
    "flv",
    "mov",
    "m4v",
  ];
  result = videoList.find((item) => item === suffix);
  if (result) return "video";
  // 匹配音频
  const audioList = ["mp3", "wav", "wmv"];
  result = audioList.find((item) => item === suffix);
  if (result) return "audio";
  // 其他文件类型
  return "other";
}

export function getFileFromUrl(url, fileName) {
  return new Promise((resolve, reject) => {
    var blob = null;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.setRequestHeader("Accept", "video/mpeg4");
    xhr.responseType = "blob";
    // 加载时处理
    xhr.onload = () => {
      // 获取返回结果
      blob = xhr.response;
      let file = new File([blob], fileName, { type: "video/mpeg4" });
      // 返回结果
      resolve(file);
    };
    xhr.onerror = (e) => {
      reject(e);
    };
    // 发送
    xhr.send();
  });
}

//将base64转换为file
export function getFileFromBase64(url, fileName) {
  const dataurl = `data:image/png;base64,${url}`;

  let arr = dataurl.split(",");
  let type = arr[0].match(/:(.*?);/)[1]; // 解锁图片类型
  let bytes = atob(arr[1]); // 解码base64
  let n = bytes.length;
  let bufferArray = new Uint8Array(n);
  while (n--) {
    bufferArray[n] = bytes.charCodeAt(n);
  }
  const file = new File([bufferArray], `${fileName}`, { type: type });
  return file;
}

export default {
  setBackLogTime,
  checkFileType,
  getFileType,
  getFileFromUrl,
  getFileFromBase64,
};
