# DPO 文件管理系统

简洁的文件管理系统，基于腾讯云 EdgeOne Pages + SCF + COS 构建。

## 功能

- ✅ 文件上传到COS
- ✅ 文件下载
- ✅ 文件列表查看
- ✅ 文件删除

## 部署步骤

### 1. 环境准备

```bash
# 安装腾讯云CLI
pip install tccli

# 配置密钥
export TENCENT_SECRET_ID="your_secret_id"
export TENCENT_SECRET_KEY="your_secret_key"

# 可选配置
export COS_REGION="ap-beijing"
export COS_BUCKET="your-bucket-name"
```

### 2. 部署后端

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 3. 部署前端

```bash
# 更新 index.html 中的 API_BASE_URL 为部署脚本输出的API地址

# 使用 EdgeOne Pages MCP 部署
npx edgeone-pages-mcp deploy-html --file=index.html
```

## 项目结构

```
├── index.html          # 前端页面
├── scf/               # SCF函数代码
│   ├── index.js       # 主函数
│   └── package.json   # 依赖配置
├── deploy.sh          # 部署脚本
└── README.md          # 说明文档
```

## API接口

| 端点 | 方法 | 功能 |
|------|------|------|
| `/upload` | POST | 文件上传 |
| `/files` | GET | 文件列表 |
| `/download` | GET | 文件下载 |
| `/delete` | DELETE | 文件删除 |

## 环境变量

SCF函数需要以下环境变量：

- `TENCENT_SECRET_ID`: 腾讯云SecretId
- `TENCENT_SECRET_KEY`: 腾讯云SecretKey  
- `COS_BUCKET`: COS存储桶名称
- `COS_REGION`: COS存储桶地域