// electron/userDataPath.js
const { app } = require('electron');
const path = require('path');

function getUserDataPath(filename = '') {
  // 返回用户数据目录或其下的某个文件
  return path.join(app.getPath('userData'), filename);
}

module.exports = { getUserDataPath };