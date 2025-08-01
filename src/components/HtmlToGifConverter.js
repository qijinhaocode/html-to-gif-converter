import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Download, Settings, Play, Square, AlertCircle } from 'lucide-react';

// 动态加载 gif.js
const loadGifJs = () => {
    return new Promise((resolve, reject) => {
        if (window.GIF) {
            resolve(window.GIF);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
        script.onload = () => {
            const workerScript = document.createElement('script');
            workerScript.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js';
            document.head.appendChild(workerScript);
            resolve(window.GIF);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const HtmlToGifConverter = () => {
    const [htmlContent, setHtmlContent] = useState('');
    const [duration, setDuration] = useState(3);
    const [fps, setFps] = useState(10);
    const [width, setWidth] = useState(400);
    const [height, setHeight] = useState(300);
    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const [gifBlob, setGifBlob] = useState(null);
    const [status, setStatus] = useState('');
    const iframeRef = useRef(null);
    const canvasRef = useRef(null);

    // 示例 HTML 动画
    const exampleHTML = `<!DOCTYPE html>
<html>
<head>
<style>
  body {
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    font-family: Arial, sans-serif;
  }
  
  .container {
    text-align: center;
  }
  
  .circle {
    width: 100px;
    height: 100px;
    background: white;
    border-radius: 50%;
    margin: 0 auto 20px;
    animation: bounce 2s ease-in-out infinite;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  }
  
  .text {
    color: white;
    font-size: 24px;
    font-weight: bold;
    animation: fade 2s ease-in-out infinite;
  }
  
  @keyframes bounce {
    0%, 100% { 
      transform: translateY(0) scale(1); 
    }
    50% { 
      transform: translateY(-50px) scale(1.1); 
    }
  }
  
  @keyframes fade {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="circle"></div>
    <div class="text">动画示例</div>
  </div>
</body>
</html>`;

    useEffect(() => {
        setHtmlContent(exampleHTML);
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setHtmlContent(event.target.result);
            };
            reader.readAsText(file);
        }
    };

    const updateIframe = () => {
        if (iframeRef.current && htmlContent) {
            try {
                const iframe = iframeRef.current;
                const doc = iframe.contentDocument || iframe.contentWindow?.document;

                if (doc) {
                    doc.open();
                    doc.write(htmlContent);
                    doc.close();
                }
            } catch (error) {
                console.error('Error updating iframe:', error);
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = htmlContent;
                }
            }
        }
    };

    useEffect(() => {
        updateIframe();
    }, [htmlContent]);

    // 将 iframe 内容绘制到 canvas（简化版）
    const drawIframeToCanvas = async (frameNumber, totalFrames) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // 清空画布
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // 计算动画进度
        const animationProgress = frameNumber / totalFrames;
        const time = animationProgress * 2 * Math.PI;
        const bounce = Math.abs(Math.sin(time));

        // 绘制背景渐变
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 绘制动画圆圈
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;

        const centerX = width / 2;
        const centerY = height / 2 - bounce * 50;
        const radius = 50 + bounce * 5;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();

        // 绘制文字
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + bounce * 0.5;
        ctx.fillText('动画示例', centerX, centerY + 100);
        ctx.globalAlpha = 1;
    };

    // 创建 GIF
    const createGif = async (frameCount) => {
        try {
            setStatus('正在加载 GIF 编码器...');
            const GIF = await loadGifJs();

            setStatus('正在创建 GIF...');

            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: width,
                height: height,
                workerScript: '/gif.worker.js'
            });

            const canvas = canvasRef.current;
            const frameDelay = 1000 / fps;

            // 捕获所有帧
            for (let i = 0; i < frameCount; i++) {
                await drawIframeToCanvas(i, frameCount);

                // 添加帧到 GIF
                gif.addFrame(canvas, {
                    copy: true,
                    delay: frameDelay
                });

                setProgress(Math.round((i + 1) / frameCount * 50 + 50));
            }

            // 渲染 GIF
            return new Promise((resolve, reject) => {
                gif.on('finished', (blob) => {
                    setStatus('GIF 创建完成！');
                    resolve(blob);
                });

                gif.on('error', reject);

                gif.render();
            });

        } catch (error) {
            console.error('创建 GIF 失败:', error);
            setStatus('创建 GIF 失败');
            throw error;
        }
    };

    // 开始录制
    const startRecording = async () => {
        setIsRecording(true);
        setProgress(0);
        setGifBlob(null);
        setStatus('开始录制...');

        try {
            const totalFrames = duration * fps;

            // 显示录制进度
            for (let i = 0; i < totalFrames; i++) {
                await drawIframeToCanvas(i, totalFrames);
                setProgress(Math.round((i + 1) / totalFrames * 50));
                await new Promise(resolve => setTimeout(resolve, 1000 / fps));
            }

            // 创建 GIF
            const blob = await createGif(totalFrames);
            setGifBlob(blob);

        } catch (error) {
            console.error('录制失败:', error);
            setStatus('录制失败');
        } finally {
            setIsRecording(false);
        }
    };

    const downloadGif = () => {
        if (gifBlob) {
            const url = URL.createObjectURL(gifBlob);
            const link = document.createElement('a');
            link.download = 'animation.gif';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                    HTML 动画转 GIF 工具
                </h1>

                {/* 提示信息 */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="text-blue-600 mr-2 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">使用说明：</p>
                            <ul className="list-disc list-inside">
                                <li>GIF 生成可能需要几秒钟，请耐心等待</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 左侧：输入和设置 */}
                    <div className="space-y-6">
                        {/* HTML 输入 */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center">
                                <Upload className="mr-2" size={20} />
                                HTML 输入
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        上传 HTML 文件
                                    </label>
                                    <input
                                        type="file"
                                        accept=".html,.htm"
                                        onChange={handleFileUpload}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        或粘贴 HTML 代码
                                    </label>
                                    <textarea
                                        value={htmlContent}
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                        className="w-full h-48 p-3 border border-gray-300 rounded-md font-mono text-sm"
                                        placeholder="粘贴你的 HTML 代码..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 设置 */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center">
                                <Settings className="mr-2" size={20} />
                                录制设置
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        时长（秒）
                                    </label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        min="1"
                                        max="10"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        帧率（FPS）
                                    </label>
                                    <input
                                        type="number"
                                        value={fps}
                                        onChange={(e) => setFps(Number(e.target.value))}
                                        min="5"
                                        max="30"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        宽度（像素）
                                    </label>
                                    <input
                                        type="number"
                                        value={width}
                                        onChange={(e) => setWidth(Number(e.target.value))}
                                        min="100"
                                        max="800"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        高度（像素）
                                    </label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(Number(e.target.value))}
                                        min="100"
                                        max="600"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={startRecording}
                                disabled={isRecording || !htmlContent}
                                className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isRecording ? (
                                    <>
                                        <Square className="mr-2" size={20} />
                                        {status || `录制中... ${progress}%`}
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2" size={20} />
                                        开始生成 GIF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 右侧：预览 */}
                    <div className="space-y-6">
                        {/* 预览 */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center">
                                <Film className="mr-2" size={20} />
                                预览
                            </h2>

                            <div className="space-y-4">
                                {/* iframe 预览 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">HTML 预览</h3>
                                    <div className="border border-gray-300 rounded-md overflow-hidden bg-gray-100">
                                        <iframe
                                            ref={iframeRef}
                                            className="w-full"
                                            style={{ height: '200px' }}
                                            sandbox="allow-scripts allow-same-origin"
                                            srcdoc={htmlContent}
                                        />
                                    </div>
                                </div>

                                {/* Canvas 预览 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">录制画布</h3>
                                    <div className="border border-gray-300 rounded-md overflow-hidden">
                                        <canvas
                                            ref={canvasRef}
                                            width={width}
                                            height={height}
                                            className="w-full"
                                            style={{ maxHeight: '300px', objectFit: 'contain', background: 'white' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GIF 结果 */}
                        {gifBlob && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center">
                                    <Download className="mr-2" size={20} />
                                    生成的 GIF
                                </h2>

                                <div className="space-y-4">
                                    <img
                                        src={URL.createObjectURL(gifBlob)}
                                        alt="Generated GIF"
                                        className="w-full rounded-md border border-gray-300"
                                    />

                                    <div className="text-sm text-gray-600">
                                        文件大小: {(gifBlob.size / 1024).toFixed(2)} KB
                                    </div>

                                    <button
                                        onClick={downloadGif}
                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
                                    >
                                        <Download className="mr-2" size={20} />
                                        下载 GIF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HtmlToGifConverter;
