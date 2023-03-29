#!/bin/zsh

MACOS_PLATFORM="darwin/amd64"
APP_NAME="GPT聊天室"
APP_TITLE="修复已破损"
APP_VERSION=$(cat wails.json | jq -r '.version')
OUTPUT_FILENAME="${APP_NAME}.${APP_VERSION}.amd64.dmg"

# 检查macOS平台
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "当前系统不支持构建macOS应用"
  exit 1
fi

# 删除上次构建的文件
rm -rfv ./build/bin
rm -fv "./build/${OUTPUT_FILENAME}"

# 构建应用并检查构建结果
if ! wails build -platform=${MACOS_PLATFORM}; then
  echo "构建应用失败"
  exit 1
fi

# 创建软链接，复制文件并为可执行文件添加权限
ln -sv /Applications "./build/bin/"
cp -av "./${APP_TITLE}" "./build/bin/"
chmod +x "./build/bin/${APP_TITLE}"

# 创建 .dmg 安装包
hdiutil create -fs HFS+ -srcfolder "./build/bin" -volname "${APP_NAME}" "./build/${OUTPUT_FILENAME}"
if [ $? != 0 ]; then
  echo "构建镜像失败"
  exit 1
fi

echo "构建成功！输出文件: ./build/${OUTPUT_FILENAME}"