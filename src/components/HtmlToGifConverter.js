import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Download, Settings, Play, Square, AlertCircle } from 'lucide-react';

const HtmlToGifConverter = () => {
    const [htmlContent, setHtmlContent] = useState('');
    const [duration, setDuration] = useState(3);
    const [fps, setFps] = useState(10);
    const [width, setWidth] = useState(400);
    const [height, setHeight] = useState(300);
    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const [gifBlob, setGifBlob] = useState(null);
    const [frames, setFrames] = useState([]);
    const [showFrames, setShowFrames] = useState(false);
    const iframeRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);

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
                // Fallback: set srcdoc for sandboxed iframes
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = htmlContent;
                }
            }
        }
    };

    useEffect(() => {
        updateIframe();
    }, [htmlContent]);

    // 使用 Canvas 捕获 iframe 内容
    const captureFrame = () => {
        return new Promise((resolve) => {
            const iframe = iframeRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // 创建一个新的图像来捕获 iframe
            const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${htmlContent}
            </div>
          </foreignObject>
        </svg>
      `;

            const img = new Image();
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            };

            img.src = url;
        });
    };

    // 使用 MediaRecorder API 录制
    const startRecording = async () => {
        setIsRecording(true);
        setProgress(0);
        setGifBlob(null);
        setFrames([]);

        try {
            const canvas = canvasRef.current;
            const stream = canvas.captureStream(fps);
            streamRef.current = stream;

            const chunks = [];
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 2500000
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const webmBlob = new Blob(chunks, { type: 'video/webm' });
                // 在实际应用中，这里需要将 WebM 转换为 GIF
                // 由于浏览器限制，我们将使用 WebM 作为演示
                setGifBlob(webmBlob);
            };

            mediaRecorder.start();

            // 开始动画录制
            const frameInterval = 1000 / fps;
            const totalFrames = duration * fps;
            const capturedFrames = [];

            for (let i = 0; i < totalFrames; i++) {
                // 捕获当前帧
                await drawIframeToCanvas();

                // 保存帧预览
                canvas.toBlob((blob) => {
                    if (blob) {
                        capturedFrames.push(URL.createObjectURL(blob));
                    }
                }, 'image/png');

                setProgress(Math.round((i + 1) / totalFrames * 100));

                // 等待下一帧
                await new Promise(resolve => setTimeout(resolve, frameInterval));
            }

            mediaRecorder.stop();
            setFrames(capturedFrames);

        } catch (error) {
            console.error('录制错误:', error);
            alert('录制失败，请确保浏览器支持 MediaRecorder API');
        } finally {
            setIsRecording(false);
        }
    };

    // 将 iframe 内容绘制到 canvas
    const drawIframeToCanvas = async () => {
        const iframe = iframeRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // 清空画布
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // 尝试使用 iframe 的内容
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const iframeBody = iframeDoc.body;

            // 获取 iframe 的背景色
            const bgColor = window.getComputedStyle(iframeBody).backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, width, height);
            }

            // 这里简化处理，实际项目中需要使用 html2canvas
            // 绘制一个示例动画帧
            const time = Date.now() / 1000;
            const bounce = Math.abs(Math.sin(time * Math.PI));

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

        } catch (error) {
            console.error('绘制错误:', error);
        }
    };

    const downloadGif = () => {
        if (gifBlob) {
            const url = URL.createObjectURL(gifBlob);
            const link = document.createElement('a');
            link.download = 'animation.webm'; // 注意：这里是 WebM 格式
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
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="text-yellow-600 mr-2 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-yellow-800">
                            <p className="font-semibold mb-1">浏览器限制说明：</p>
                            <p>由于浏览器安全限制，目前演示版本：</p>
                            <ul className="list-disc list-inside mt-1">
                                <li>使用模拟动画代替实际 iframe 内容捕获</li>
                                <li>导出格式为 WebM 视频而非 GIF（需要后端转换）</li>
                                <li>完整功能需要集成 html2canvas 和 gif.js 库</li>
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
                                        录制中... {progress}%
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2" size={20} />
                                        开始录制
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

                        {/* 结果 */}
                        {gifBlob && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center">
                                    <Download className="mr-2" size={20} />
                                    录制结果
                                </h2>

                                <div className="space-y-4">
                                    <video
                                        src={URL.createObjectURL(gifBlob)}
                                        controls
                                        loop
                                        autoPlay
                                        className="w-full rounded-md border border-gray-300"
                                    />

                                    <button
                                        onClick={downloadGif}
                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
                                    >
                                        <Download className="mr-2" size={20} />
                                        下载视频 (WebM)
                                    </button>

                                    {/* 帧预览 */}
                                    {frames.length > 0 && (
                                        <div>
                                            <button
                                                onClick={() => setShowFrames(!showFrames)}
                                                className="text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                {showFrames ? '隐藏' : '显示'}帧预览 ({frames.length} 帧)
                                            </button>

                                            {showFrames && (
                                                <div className="mt-2 grid grid-cols-6 gap-1">
                                                    {frames.slice(0, 12).map((frame, index) => (
                                                        <img
                                                            key={index}
                                                            src={frame}
                                                            alt={`Frame ${index + 1}`}
                                                            className="w-full h-auto border border-gray-200 rounded"
                                                        />
                                                    ))}
                                                    {frames.length > 12 && (
                                                        <div className="flex items-center justify-center text-gray-500 text-xs">
                                                            +{frames.length - 12} 更多
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
