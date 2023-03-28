#!/bin/zsh
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "当前系统不支持构建MacOs应用"
  exit 1
fi
rm -rf ./build/bin
if ! wails build; then
  echo "构建失败"
  exit 1
fi
ln -s /Applications ./build/bin/
cp ./修复已破损 ./build/bin/
chmod +x ./build/bin/修复已破损

hdiutil create -fs HFS+ -srcfolder ./build/bin -volname "GPT聊天室" ./build/bin/GPT聊天室.arm64
if [ $? != 0 ]; then
  echo "构建镜像失败"
fi
