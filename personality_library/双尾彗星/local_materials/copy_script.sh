#!/bin/bash
# 双尾彗星本地资料复制脚本
# 用户可在本地终端执行此脚本

SOURCE_DIR="/Users/quietLeaf/Coze/data/shuangweihuixing"
TARGET_DIR="./personality_library/双尾彗星/local_materials"

echo "=== 双尾彗星本地资料复制脚本 ==="
echo "源目录: $SOURCE_DIR"
echo "目标目录: $TARGET_DIR"
echo ""

# 检查源目录
if [ ! -d "$SOURCE_DIR" ]; then
    echo "错误: 源目录不存在"
    exit 1
fi

# 创建目标目录
mkdir -p "$TARGET_DIR/book"
mkdir -p "$TARGET_DIR/transcript"

echo "正在复制 book 目录下的 PDF 文件..."
cp -v "$SOURCE_DIR/book/"*.pdf "$TARGET_DIR/book/" 2>&1

echo ""
echo "正在复制 transcript 目录下的音频文件..."
cp -v "$SOURCE_DIR/transcript/"* "$TARGET_DIR/transcript/" 2>&1

echo ""
echo "=== 复制完成 ==="
echo "文件已复制到: $TARGET_DIR"
ls -la "$TARGET_DIR/book/" | head -20
echo "..."
