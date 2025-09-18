# DPO 文件管理系统

简洁的文件管理系统，基于腾讯云 EdgeOne Pages + SCF + COS 构建。

## 功能

- ✅ 文件上传到COS
- ✅ 文件下载
- ✅ 文件列表查看
- ✅ 文件删除

## 部署步骤

### 方式一：控制台手动部署（推荐新手）

#### 1. 准备COS存储桶

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **对象存储COS** 服务
3. 创建存储桶（如果还没有）：
   - 存储桶名称：如 `dpo-files-1234567890`
   - 地域：选择合适的地域（如广州 ap-guangzhou）
   - 访问权限：私有读写
4. 记录存储桶名称和地域信息

#### 2. 创建SCF函数

1. 进入 **云函数SCF** 服务
2. 点击 **新建函数**
3. 选择 **自定义创建**
4. 配置基本信息：
   - 函数名称：`dpo-file-manager`
   - 运行环境：`Node.js 18.15`
   - 地域：选择与COS相同的地域

#### 3. 上传函数代码

1. 在函数配置页面，选择 **函数代码** 标签
2. 提交方法选择 **在线编辑**
3. **处理默认文件**：
   - SCF会默认创建一个 `index.js` 文件（不是app.js）
   - 将该默认 `index.js` 文件的内容全部删除
   - 将我们项目中 `scf/index.js` 的内容复制粘贴进去
4. **添加package.json**：
   - 在文件列表中点击 **新建文件**
   - 文件名输入：`package.json`
   - 将 `scf/package.json` 的内容复制进去
5. **添加scf_bootstrap**：
   - 再次点击 **新建文件**
   - 文件名输入：`scf_bootstrap`（注意：无扩展名）
   - 内容如下：
   ```bash
   #!/bin/bash
   
   # 设置npm镜像源（加速安装）
   export npm_config_registry=https://registry.npmmirror.com
   
   # 检查并安装依赖
   if [ ! -d "node_modules" ] || [ ! -d "node_modules/cos-nodejs-sdk-v5" ]; then
       echo "Installing dependencies..."
       /var/lang/node18/bin/npm install cos-nodejs-sdk-v5@^2.12.4 multiparty@^4.2.3
   fi
   
   # 启动函数
   /var/lang/node18/bin/node index.js
   ```
   **优势**：这个启动脚本会在函数启动时自动检查并安装缺失的依赖，无需手动打包node_modules
7. **依赖安装**（重要步骤）：
   - 方法一：点击 **安装依赖** 按钮，等待安装完成
   - 方法二：如果安装失败，手动在终端中创建node_modules：
     ```bash
     cd scf
     npm install
     zip -r ../scf-code.zip .
     ```
   - 然后在SCF控制台选择 **本地上传zip包** 方式上传
8. 点击 **部署**

**⚠️ 依赖安装问题排查：**
如果遇到 `Cannot find module 'cos-nodejs-sdk-v5'` 错误，推荐使用以下解决方案：

**方案一：使用自动安装依赖的scf_bootstrap（推荐）**
1. 使用更新后的 `scf_bootstrap` 文件（包含自动依赖安装）
2. 只需上传 `index.js`、`package.json`、`scf_bootstrap` 三个文件
3. 函数启动时会自动安装依赖，无需手动打包node_modules
4. 首次启动可能需要等待几秒钟安装依赖

**方案二：使用预打包的部署包**
1. 下载项目根目录下的 `scf-complete.zip` 文件
2. 在SCF控制台选择 **本地上传zip包**
3. 上传 `scf-complete.zip` 文件
4. 部署完成

**方案二：本地重新打包**
```bash
# 在项目根目录下
cd scf

# 安装所有依赖
npm install

# 或者手动安装缺失的依赖
npm install cos-nodejs-sdk-v5@^2.12.4
npm install multiparty@^4.2.3

# 打包所有文件
zip -r ../scf-function.zip index.js package.json scf_bootstrap node_modules/
```
然后在SCF控制台选择"本地上传zip包"上传

**方案三：控制台在线安装（可能不稳定）**
1. 在SCF控制台手动创建文件
2. 粘贴代码后点击"安装依赖"
3. 如果失败，使用方案一或方案二

**注意事项：**
- SCF控制台的在线依赖安装可能因网络问题失败
- 使用zip包上传是最可靠的方式
- 确保zip包包含了完整的node_modules目录

#### 4. 配置环境变量

1. 选择 **环境配置** 标签
2. 在环境变量中添加：
   ```
   TENCENT_SECRET_ID=你的SecretId
   TENCENT_SECRET_KEY=你的SecretKey  
   COS_BUCKET=你的存储桶名称（如dpo-files-1234567890）
   COS_REGION=你的存储桶地域（如ap-guangzhou）
   ```
3. 点击 **保存**

#### 5. 配置TSE云原生API网关

1. 进入 **TSE微服务引擎** 控制台
2. 选择 **云原生API网关** 服务
3. 创建或选择已有的网关实例
4. 在网关实例中创建服务：
   - 服务名称：`dpo-file-manager`
   - 后端类型：选择 **云函数SCF**
   - 选择刚创建的SCF函数
5. 创建路由规则：
   - 路径：`/api/*`（或根据需要配置）
   - 方法：`ANY`
   - 后端服务：选择上面创建的服务
6. 配置CORS策略：
   - 允许的源：`*`
   - 允许的方法：`GET,POST,PUT,DELETE,OPTIONS`
   - 允许的头部：`Content-Type,Authorization`
7. 发布配置并获取网关访问地址

#### 6. 获取TSE网关访问地址

1. 在TSE控制台查看网关实例详情
2. 复制网关的公网访问地址
3. 完整的API地址格式：`https://your-gateway-domain/api`

#### 7. 更新前端配置

1. 打开 `index.html` 文件
2. 找到第12行的 `API_BASE_URL`
3. 将其替换为TSE网关的访问地址：
   ```javascript
   const API_BASE_URL = 'https://your-gateway-domain/api';
   ```
   **注意**：将 `your-gateway-domain` 替换为实际的TSE网关域名
4. 保存文件

#### 8. 部署前端

```bash
# 使用 EdgeOne Pages MCP 部署
npx edgeone-pages-mcp deploy-html --file=index.html
```

### 方式二：脚本自动部署

#### 1. 环境准备

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

#### 2. 部署后端

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

#### 3. 部署前端

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
│   ├── package.json   # 依赖配置
│   └── scf_bootstrap  # SCF启动脚本（Node.js 18.15必需）
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

## 常见问题排查

### 1. SCF部署错误：Cannot find module 'cos-nodejs-sdk-v5'

**原因**：依赖包未正确安装

**解决方案**：

**A. 完整重新安装依赖**
```bash
cd scf
# 清理现有依赖
rm -rf node_modules package-lock.json

# 重新安装所有依赖
npm install

# 或者逐个安装
npm install cos-nodejs-sdk-v5@^2.12.4
npm install multiparty@^4.2.3

# 验证安装
ls node_modules/cos-nodejs-sdk-v5
ls node_modules/multiparty

# 打包上传
zip -r ../scf-function.zip index.js package.json scf_bootstrap node_modules/
```

**B. 使用层管理（高级用户）**
```bash
# 创建依赖层
mkdir nodejs
cd nodejs
npm install cos-nodejs-sdk-v5 multiparty
cd ..
zip -r dependencies-layer.zip nodejs/

# 在SCF控制台创建层，上传dependencies-layer.zip
# 然后在函数配置中绑定该层
```

**C. 检查依赖完整性**
```bash
# 检查package.json
cat scf/package.json

# 检查已安装的包
npm list --depth=0

# 测试依赖加载
node -e "console.log(require('cos-nodejs-sdk-v5'))"
node -e "console.log(require('multiparty'))"

# 检查依赖文件是否存在
ls -la node_modules/cos-nodejs-sdk-v5/
ls -la node_modules/multiparty/
```

**D. 针对SCF环境的依赖安装**
```bash
# 进入scf目录
cd scf

# 使用npm安装（推荐使用淘宝镜像加速）
npm config set registry https://registry.npmmirror.com
npm install

# 或者使用cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install

# 安装特定版本的依赖
npm install cos-nodejs-sdk-v5@2.12.4 --save
npm install multiparty@4.2.3 --save

# 强制重新安装
npm install --force

# 清除npm缓存后重新安装
npm cache clean --force
npm install
```

**E. 创建完整的SCF部署包**
```bash
# 确保在scf目录下
cd scf

# 验证所有文件都存在
ls -la index.js package.json scf_bootstrap node_modules/

# 创建部署包
zip -r ../scf-deploy.zip index.js package.json scf_bootstrap node_modules/

# 检查zip包内容
unzip -l ../scf-deploy.zip | head -20
```

### 2. TSE云原生API网关CORS错误

**原因**：跨域配置不正确

**解决方案**：
- 在TSE控制台检查CORS策略配置
- 确保允许的源设置为 `*`
- 确保允许的方法包含 `GET,POST,PUT,DELETE,OPTIONS`
- 确保允许的头部包含 `Content-Type,Authorization`
- 检查网关配置是否已正确发布
- 验证路由规则是否正确匹配请求路径

### 3. COS权限错误

**原因**：SecretId/SecretKey权限不足

**解决方案**：
- 确保密钥有COS读写权限
- 检查存储桶名称和地域配置正确
- 验证环境变量设置无误