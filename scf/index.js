const COS = require('cos-nodejs-sdk-v5');
const path = require('path');
const querystring = require('querystring');

// COS 配置
const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
});

const BUCKET = process.env.COS_BUCKET;
const REGION = process.env.COS_REGION;

// CORS 头部
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// 主处理函数
exports.main_handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // 处理 OPTIONS 请求
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: ''
            };
        }

        const path = event.path || '';
        const method = event.httpMethod || 'GET';

        if (path.includes('/upload') && method === 'POST') {
            return await handleUpload(event);
        } else if (path.includes('/files') && method === 'GET') {
            return await handleFileList(event);
        } else if (path.includes('/download') && method === 'GET') {
            return await handleDownload(event);
        } else if (path.includes('/delete') && method === 'DELETE') {
            return await handleDelete(event);
        } else {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, message: 'API not found' })
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};

// 处理文件上传
async function handleUpload(event) {
    try {
        // 简化的文件上传处理 - 使用 base64 编码
        const body = event.isBase64Encoded ? 
            Buffer.from(event.body, 'base64') : 
            Buffer.from(event.body || '', 'utf8');

        // 从查询参数或头部获取文件名
        const fileName = event.queryStringParameters?.filename || 
                        event.headers?.['x-filename'] || 
                        `file_${Date.now()}.bin`;

        // 生成文件key
        const timestamp = Date.now();
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        const fileKey = `uploads/${timestamp}_${baseName}${ext}`;

        // 上传到COS
        const result = await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: BUCKET,
                Region: REGION,
                Key: fileKey,
                Body: body,
                ContentLength: body.length
            }, (err, data) => {
                if (err) {
                    console.error('COS upload error:', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Upload success',
                data: { key: fileKey, name: fileName }
            })
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
}

// 处理文件列表
async function handleFileList(event) {
    try {
        const data = await new Promise((resolve, reject) => {
            cos.getBucket({
                Bucket: BUCKET,
                Region: REGION,
                Prefix: 'uploads/',
                MaxKeys: 100
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        const files = data.Contents?.map(item => ({
            key: item.Key,
            name: path.basename(item.Key),
            size: parseInt(item.Size),
            lastModified: item.LastModified
        })) || [];

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, files })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'List failed' })
        };
    }
}

// 处理文件下载
async function handleDownload(event) {
    try {
        const fileKey = event.queryStringParameters?.key;
        if (!fileKey) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, message: 'Key required' })
            };
        }

        // 生成预签名下载URL
        const url = cos.getObjectUrl({
            Bucket: BUCKET,
            Region: REGION,
            Key: fileKey,
            Sign: true,
            Expires: 3600
        });

        return {
            statusCode: 302,
            headers: { ...corsHeaders, 'Location': url },
            body: ''
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'Download failed' })
        };
    }
}

// 处理文件删除
async function handleDelete(event) {
    try {
        const body = JSON.parse(event.body || '{}');
        const fileKey = body.key;

        if (!fileKey) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, message: 'Key required' })
            };
        }

        await new Promise((resolve, reject) => {
            cos.deleteObject({
                Bucket: BUCKET,
                Region: REGION,
                Key: fileKey
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Delete success' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'Delete failed' })
        };
    }
}