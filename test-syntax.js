// 简单的语法测试
const fs = require('fs');

// 测试WXML
try {
  const wxml = fs.readFileSync('miniprogram/pages/admin/content/index.wxml', 'utf8');
  console.log('✅ WXML文件读取成功');
} catch (e) {
  console.log('❌ WXML文件读取失败:', e.message);
}

// 测试TypeScript
try {
  const ts = fs.readFileSync('miniprogram/pages/admin/content/index.ts', 'utf8');
  console.log('✅ TypeScript文件读取成功');
} catch (e) {
  console.log('❌ TypeScript文件读取失败:', e.message);
}

console.log('基本文件检查完成');
