import logging
import os
import sys
import threading
import time
from io import BytesIO
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
from http.server import HTTPServer, SimpleHTTPRequestHandler

# 配置调试日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.code = None

    def send_response(self, code, message=None):
        self.code = code
        super().send_response(code, message)

    def send_head(self):
        # 记录原始请求
        original_path = self.path
        logger.info(f"接收到请求: {original_path}")

        # 清理路径（移除查询参数和锚点）
        clean_path = self.path.split('?')[0].split('#')[0]
        self.path = clean_path
        logger.info(f"清理后路径: {clean_path}")

        # 处理根路径请求
        if clean_path == '/':
            clean_path = '/index.html'
            self.path = clean_path
            logger.info(f"根路径重定向到: {clean_path}")

        # 初始化响应头字典
        response_headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }

        # 获取文件扩展名
        ext = os.path.splitext(clean_path)[1].lower()
        # 修复Windows路径处理
        file_path = self.translate_path(clean_path)
        # 将Unix风格路径转换为Windows风格
        file_path = file_path.replace('/', '\\')
        # 确保正确指向项目data目录
        if clean_path.startswith('/data/'):
            data_dir = os.path.join(os.getcwd(), 'data')
            file_path = os.path.join(data_dir, os.path.basename(clean_path))
        # 专门针对答案数据文件的调试日志
        if clean_path == '/data/answers.json':
            logger.info(f"处理答案数据请求: {clean_path}")
            logger.info(f"操作系统当前目录: {os.getcwd()}")
            logger.info(f"数据目录: {os.path.join(os.getcwd(), 'data')}")
            logger.info(f"最终文件路径: {file_path}")
            logger.info(f"文件是否存在: {os.path.exists(file_path)}")
        logger.info(f"文件路径分析: {file_path}, 扩展名: {ext}")

        try:
            # 检查文件是否存在
            if not os.path.exists(file_path) or not os.path.isfile(file_path):
                logger.error(f"文件不存在: {file_path}")
                return super().send_head()

            # 根据文件类型设置Content-Type
            if ext == '.html':
                content_type = 'text/html; charset=utf-8'
            elif ext == '.js':
                content_type = 'text/javascript; charset=utf-8'
            elif ext == '.css':
                content_type = 'text/css; charset=utf-8'
            elif ext == '.json':
                content_type = 'application/json; charset=utf-8'
            else:
                # 使用默认MIME类型
                return super().send_head()

            # 读取文件内容
            with open(file_path, 'rb') as f:
                content = f.read()
            content_length = len(content)
            logger.info(f"读取文件成功: {clean_path}, 大小: {content_length} bytes")

            # 发送响应
            self.send_response(200)
            response_headers['Content-Type'] = content_type
            response_headers['Content-Length'] = str(content_length)

            # 设置所有响应头
            for key, value in response_headers.items():
                self.send_header(key, value)
            self.end_headers()

            logger.info(f"成功发送响应: {clean_path}, Content-Type: {content_type}")
            return BytesIO(content)

        except Exception as e:
            logger.error(f"处理请求时出错: {str(e)}, 错误类型: {type(e).__name__}", exc_info=True)
            # 发生错误时交给父类处理
            return super().send_head()

    def do_POST(self):
        logger.info(f"Received POST request to {self.path}")
        
        # 定义请求处理映射关系
        endpoints = {
            '/api/save-exams': {'file': 'exams.json', 'message': '考试数据保存成功'},
            '/api/save-answers': {'file': 'answers.json', 'message': '答案数据保存成功'},
            '/api/save-results': {'file': 'results.json', 'message': '成绩数据保存成功'},
            '/api/save-users': {'file': 'users.json', 'message': '用户数据保存成功'},
            # '/api/save-grading': {'file': 'grading.json', 'message': '批改数据保存成功'}
        }
        
        # 检查请求路径是否在支持的端点列表中
        if self.path in endpoints:
            return self._handle_save_request(endpoints[self.path])
        
        # 未知端点返回404
        return self._send_json_response(404, False, f'未知端点: {self.path}')

    # 文件锁字典，用于跟踪每个文件的锁
    file_locks = {}

    def _handle_save_request(self, config):
        """处理数据保存请求的辅助方法"""
        try:
            # 验证请求头
            if 'Content-Length' not in self.headers:
                return self._send_json_response(400, False, '缺少Content-Length请求头')

            content_length = int(self.headers['Content-Length'])
            if content_length <= 0:
                return self._send_json_response(400, False, 'Content-Length必须大于0')

            # 读取并解析请求体
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data)
            except json.JSONDecodeError as e:
                return self._send_json_response(400, False, f'JSON解析错误: {str(e)}')

            # 保存到文件
            data_dir = os.path.join(os.getcwd(), 'data')
            os.makedirs(data_dir, exist_ok=True)
            file_path = os.path.join(data_dir, config['file'])

            # 获取文件锁，如果不存在则创建
            if file_path not in self.file_locks:
                self.file_locks[file_path] = threading.Lock()

            # 尝试获取锁，最多等待5秒
            lock_acquired = self.file_locks[file_path].acquire(timeout=5)
            if not lock_acquired:
                return self._send_json_response(503, False, f'文件操作繁忙，请稍后再试')

            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                logger.info(f'{config["message"]}到{config["file"]}')
                return self._send_json_response(200, True, config['message'])
            finally:
                # 释放锁
                self.file_locks[file_path].release()

        except Exception as e:
            logger.error(f'{config["message"].split("数据")[0]}数据保存失败: {str(e)}', exc_info=True)
            return self._send_json_response(500, False, f'{config["message"].split("数据")[0]}数据保存失败: {str(e)}')

    def _send_json_response(self, status_code, success, message):
        """发送JSON格式响应的辅助方法"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response = json.dumps({
            'success': success,
            'message': message
        }).encode('utf-8')
        self.wfile.write(response)
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

class ThreadedHTTPServer(HTTPServer):
    """多线程HTTP服务器"""
    def process_request(self, request, client_address):
        # 为每个请求创建一个新线程
        thread = threading.Thread(
            target=self._new_thread_process_request,
            args=(request, client_address)
        )
        thread.daemon = True
        thread.start()

    def _new_thread_process_request(self, request, client_address):
        try:
            self.finish_request(request, client_address)
            self.shutdown_request(request)
        except Exception:
            self.handle_error(request, client_address)
            self.shutdown_request(request)

if __name__ == '__main__':
    server_address = ('0.0.0.0', 8080)
    # 使用多线程服务器
    httpd = ThreadedHTTPServer(server_address, CustomHandler)
    logger.info(f"Serving HTTP on http://localhost:8080 with multi-threading")  # http://localhost:8080   127.0.0.1  0.0.0.0:8080
    try:
        httpd.serve_forever()
    except Exception as e:
        logger.critical(f"服务器启动失败: {str(e)}", exc_info=True)
        raise