#!/usr/bin/env python3
"""
DeviceStress Backend - Professional System Stress Testing Platform
Provides real-time system monitoring and stress testing via REST API & WebSocket
"""

import os
import sys
import psutil
import json
import asyncio
import threading
import time
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import logging

# ============ LOGGING SETUP ============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ FLASK APP INITIALIZATION ============
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ============ GLOBAL STATE ============
class StressTestManager:
    def __init__(self):
        self.is_running = False
        self.start_time = None
        self.duration = 30
        self.intensity = 3
        self.selected_tests = set(['cpu', 'memory', 'gpu'])
        self.metrics = {
            'cpu': 0,
            'memory': 0,
            'gpu': 0,
            'temperature': 25,
            'operations': 0,
            'fps': 60,
            'timestamp': datetime.now().isoformat()
        }
        self.baseline_metrics = {}
        self.peak_metrics = {}
        self.lock = threading.Lock()

stress_manager = StressTestManager()

# ============ SYSTEM MONITORING ============
class SystemMonitor:
    @staticmethod
    def get_cpu_usage():
        """Get current CPU usage percentage"""
        return psutil.cpu_percent(interval=0.1)
    
    @staticmethod
    def get_memory_usage():
        """Get memory usage information"""
        memory = psutil.virtual_memory()
        return {
            'used': memory.used,
            'total': memory.total,
            'percent': memory.percent,
            'available': memory.available
        }
    
    @staticmethod
    def get_cpu_count():
        """Get number of CPU cores"""
        return {
            'physical': psutil.cpu_count(logical=False),
            'logical': psutil.cpu_count(logical=True)
        }
    
    @staticmethod
    def get_process_info():
        """Get current process resource usage"""
        process = psutil.Process()
        return {
            'cpu_percent': process.cpu_percent(interval=0.1),
            'memory_mb': process.memory_info().rss / (1024 * 1024),
            'num_threads': process.num_threads()
        }
    
    @staticmethod
    def get_disk_usage():
        """Get disk usage information"""
        disk = psutil.disk_usage('/')
        return {
            'used': disk.used,
            'total': disk.total,
            'percent': disk.percent,
            'free': disk.free
        }
    
    @staticmethod
    def estimate_temperature():
        """Estimate device temperature (platform-dependent)"""
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                # Get first available temperature
                for name, entries in temps.items():
                    if entries:
                        return entries[0].current
        except (AttributeError, OSError):
            pass
        # Fallback: estimate based on CPU usage
        cpu = psutil.cpu_percent(interval=0.1)
        return 35 + (cpu * 0.5)  # Estimate: 35°C base + CPU load

monitor = SystemMonitor()

# ============ STRESS TEST OPERATIONS ============
class StressOperations:
    @staticmethod
    def cpu_stress(duration, intensity):
        """CPU-intensive operations"""
        operations = 0
        start_time = time.time()
        
        while time.time() - start_time < duration:
            for _ in range(1000 * intensity):
                _ = __import__('math').sqrt(__import__('random').random())
                _ = __import__('math').sin(__import__('random').random())
                operations += 1
        
        return operations
    
    @staticmethod
    def memory_stress(duration, intensity):
        """Memory-intensive operations"""
        buffers = []
        start_time = time.time()
        allocated = 0
        
        try:
            while time.time() - start_time < duration:
                # Allocate 1MB chunks
                size = 1024 * 1024 * intensity
                buffer = bytearray(size)
                # Fill with data
                for i in range(0, len(buffer), 1024):
                    buffer[i] = __import__('random').randint(0, 255)
                buffers.append(buffer)
                allocated += size
        except MemoryError:
            logger.warning(f"Memory stress hit limit at {allocated / (1024*1024)} MB")
        
        return allocated
    
    @staticmethod
    def io_stress(duration, intensity):
        """I/O operations stress"""
        operations = 0
        start_time = time.time()
        
        while time.time() - start_time < duration:
            try:
                # Simulate disk operations
                import tempfile
                with tempfile.TemporaryFile() as f:
                    for i in range(100 * intensity):
                        f.write(b'test data ' * 100)
                        operations += 1
                        f.seek(0)
            except:
                pass
        
        return operations

# ============ BACKGROUND METRIC COLLECTION ============
def collect_metrics():
    """Continuously collect system metrics"""
    while True:
        try:
            with stress_manager.lock:
                memory_info = monitor.get_memory_usage()
                
                stress_manager.metrics = {
                    'cpu': monitor.get_cpu_usage(),
                    'memory': {
                        'used_mb': memory_info['used'] / (1024 * 1024),
                        'total_mb': memory_info['total'] / (1024 * 1024),
                        'percent': memory_info['percent']
                    },
                    'temperature': monitor.estimate_temperature(),
                    'operations': stress_manager.metrics.get('operations', 0),
                    'process': monitor.get_process_info(),
                    'timestamp': datetime.now().isoformat()
                }
                
                # Update peak metrics
                if stress_manager.is_running:
                    if 'peak_cpu' not in stress_manager.peak_metrics:
                        stress_manager.peak_metrics = {
                            'peak_cpu': stress_manager.metrics['cpu'],
                            'peak_memory': stress_manager.metrics['memory']['percent'],
                            'peak_temp': stress_manager.metrics['temperature']
                        }
                    else:
                        stress_manager.peak_metrics['peak_cpu'] = max(
                            stress_manager.peak_metrics['peak_cpu'],
                            stress_manager.metrics['cpu']
                        )
                        stress_manager.peak_metrics['peak_memory'] = max(
                            stress_manager.peak_metrics['peak_memory'],
                            stress_manager.metrics['memory']['percent']
                        )
                        stress_manager.peak_metrics['peak_temp'] = max(
                            stress_manager.peak_metrics['peak_temp'],
                            stress_manager.metrics['temperature']
                        )
        
        except Exception as e:
            logger.error(f"Metric collection error: {e}")
        
        time.sleep(0.5)

# ============ FLASK ROUTES ============
@app.route('/')
def index():
    """Serve main page"""
    return render_template('index.html')

@app.route('/api/system-info')
def get_system_info():
    """Get system information"""
    return jsonify({
        'cpu_count': monitor.get_cpu_count(),
        'memory': monitor.get_memory_usage(),
        'disk': monitor.get_disk_usage(),
        'platform': sys.platform
    })

@app.route('/api/metrics')
def get_metrics():
    """Get current metrics"""
    with stress_manager.lock:
        return jsonify(stress_manager.metrics)

@app.route('/api/stress/start', methods=['POST'])
def start_stress():
    """Start stress test"""
    data = request.json
    
    with stress_manager.lock:
        if stress_manager.is_running:
            return jsonify({'error': 'Test already running'}), 400
        
        stress_manager.duration = data.get('duration', 30)
        stress_manager.intensity = data.get('intensity', 3)
        stress_manager.selected_tests = set(data.get('tests', ['cpu']))
        stress_manager.is_running = True
        stress_manager.start_time = time.time()
        stress_manager.peak_metrics = {}
    
    # Run stress test in background
    thread = threading.Thread(target=run_stress_test, daemon=True)
    thread.start()
    
    return jsonify({'status': 'started'})

@app.route('/api/stress/stop', methods=['POST'])
def stop_stress():
    """Stop stress test"""
    with stress_manager.lock:
        stress_manager.is_running = False
    
    return jsonify({'status': 'stopped'})

@app.route('/api/stress/results')
def get_results():
    """Get test results"""
    elapsed = time.time() - stress_manager.start_time if stress_manager.start_time else 0
    
    with stress_manager.lock:
        return jsonify({
            'elapsed': elapsed,
            'peak_metrics': stress_manager.peak_metrics,
            'current_metrics': stress_manager.metrics,
            'tests_run': list(stress_manager.selected_tests),
            'duration': stress_manager.duration,
            'intensity': stress_manager.intensity
        })

# ============ WEBSOCKET EVENTS ============
@socketio.on('connect')
def handle_connect():
    """Client connected"""
    logger.info(f"Client connected: {request.sid}")
    emit('connection_response', {'data': 'Connected to DeviceStress'})

@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('request_metrics')
def handle_metrics_request():
    """Send current metrics to client"""
    with stress_manager.lock:
        emit('metrics_update', stress_manager.metrics)

@socketio.on('start_test')
def handle_start_test(data):
    """Start stress test"""
    logger.info(f"Starting test: {data}")
    
    with stress_manager.lock:
        if stress_manager.is_running:
            emit('error', {'message': 'Test already running'})
            return
        
        stress_manager.duration = data.get('duration', 30)
        stress_manager.intensity = data.get('intensity', 3)
        stress_manager.selected_tests = set(data.get('tests', ['cpu']))
        stress_manager.is_running = True
        stress_manager.start_time = time.time()
        stress_manager.peak_metrics = {}
    
    emit('test_started', {'timestamp': datetime.now().isoformat()})
    
    # Run stress test in background
    thread = threading.Thread(target=run_stress_test, daemon=True)
    thread.start()

@socketio.on('stop_test')
def handle_stop_test():
    """Stop stress test"""
    logger.info("Stopping test")
    with stress_manager.lock:
        stress_manager.is_running = False
    emit('test_stopped', {'timestamp': datetime.now().isoformat()})

# ============ STRESS TEST EXECUTION ============
def run_stress_test():
    """Execute stress test"""
    try:
        test_duration = (stress_manager.duration * 1000) / max(len(stress_manager.selected_tests), 1) / 1000
        
        for test_name in stress_manager.selected_tests:
            if not stress_manager.is_running:
                break
            
            logger.info(f"Running test: {test_name}")
            socketio.emit('test_progress', {
                'test': test_name,
                'status': 'running'
            }, broadcast=True)
            
            if test_name == 'cpu':
                ops = StressOperations.cpu_stress(test_duration, stress_manager.intensity)
                with stress_manager.lock:
                    stress_manager.metrics['operations'] += ops
            
            elif test_name == 'memory':
                allocated = StressOperations.memory_stress(test_duration, stress_manager.intensity)
                with stress_manager.lock:
                    stress_manager.metrics['operations'] += allocated // 1024
            
            elif test_name == 'io':
                ops = StressOperations.io_stress(test_duration, stress_manager.intensity)
                with stress_manager.lock:
                    stress_manager.metrics['operations'] += ops
        
        with stress_manager.lock:
            stress_manager.is_running = False
        
        socketio.emit('test_completed', {
            'timestamp': datetime.now().isoformat(),
            'peak_metrics': stress_manager.peak_metrics
        }, broadcast=True)
        
        logger.info("Stress test completed")
    
    except Exception as e:
        logger.error(f"Stress test error: {e}")
        socketio.emit('error', {'message': str(e)}, broadcast=True)

# ============ ERROR HANDLERS ============
@app.errorhandler(404)
def not_found(e):
    """404 handler"""
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    """500 handler"""
    logger.error(f"Server error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

# ============ MAIN ============
if __name__ == '__main__':
    # Start metrics collection thread
    metrics_thread = threading.Thread(target=collect_metrics, daemon=True)
    metrics_thread.start()
    logger.info("DeviceStress backend started")
    
    # Run Flask app with SocketIO
    socketio.run(
        app,
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )
