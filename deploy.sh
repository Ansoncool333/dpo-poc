#!/bin/bash

# DPO文件管理系统部署脚本

echo "🚀 开始部署 DPO 文件管理系统..."

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "❌ 请设置环境变量 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY"
    exit 1
fi

# 设置默认值
REGION=${COS_REGION:-"ap-beijing"}
BUCKET_NAME=${COS_BUCKET:-"dpo-files-$(date +%s)"}

echo "📋 配置信息:"
echo "  地域: $REGION"
echo "  存储桶: $BUCKET_NAME"

# 1. 创建COS存储桶
echo "🪣 创建COS存储桶..."
tccli cos PutBucket --bucket $BUCKET_NAME --region $REGION

# 2. 配置CORS
echo "🔧 配置CORS..."
cat > cors.json << EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "POST", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF

tccli cos PutBucketCors --bucket $BUCKET_NAME --region $REGION --cors-configuration file://cors.json
rm cors.json

# 3. 部署SCF函数
echo "⚡ 部署SCF函数..."
cd scf
npm install
zip -r ../function.zip .
cd ..

# 创建函数
tccli scf CreateFunction \
    --function-name "dpo-file-manager" \
    --region $REGION \
    --code '{"ZipFile": "'$(base64 -i function.zip | tr -d '\n')'"}' \
    --handler "index.main_handler" \
    --runtime "Nodejs16.13" \
    --memory-size 512 \
    --timeout 30 \
    --environment '{
        "Variables": {
            "TENCENT_SECRET_ID": "'$TENCENT_SECRET_ID'",
            "TENCENT_SECRET_KEY": "'$TENCENT_SECRET_KEY'",
            "COS_BUCKET": "'$BUCKET_NAME'",
            "COS_REGION": "'$REGION'"
        }
    }'

# 4. 创建API网关
echo "🌐 创建API网关..."
SERVICE_RESULT=$(tccli apigateway CreateService \
    --region $REGION \
    --service-name "dpo-api" \
    --service-desc "DPO文件管理API" \
    --protocol "https")

SERVICE_ID=$(echo $SERVICE_RESULT | jq -r '.ServiceId')

# 创建API
tccli apigateway CreateApi \
    --region $REGION \
    --service-id $SERVICE_ID \
    --api-name "dpo-upload" \
    --api-desc "文件上传" \
    --api-type "NORMAL" \
    --auth-type "NONE" \
    --protocol "HTTPS" \
    --request-config '{"Path": "/upload", "Method": "POST"}' \
    --service-type "SCF" \
    --service-scf-function-name "dpo-file-manager"

# 发布服务
tccli apigateway ReleaseService \
    --region $REGION \
    --service-id $SERVICE_ID \
    --environment-name "release"

API_URL="https://${SERVICE_ID}.apigw.tencentcs.com/release"

echo "✅ 部署完成!"
echo "🔗 API地址: $API_URL"
echo "📝 请将此地址更新到 index.html 中的 API_BASE_URL"

# 清理
rm function.zip

echo "🎉 部署完成! 现在可以使用 EdgeOne Pages MCP 部署前端页面"