const mongoose = require('mongoose');
const fs = require('fs');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            operations: [],
            errors: [],
            memoryUsage: [],
            cpuUsage: []
        };
    }

    // 메모리 사용량 모니터링
    monitorMemory() {
        const usage = process.memoryUsage();
        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            rss: usage.rss,
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external
        });
    }

    // CPU 사용량 모니터링
    monitorCPU() {
        const startUsage = process.cpuUsage();
        setTimeout(() => {
            const endUsage = process.cpuUsage(startUsage);
            this.metrics.cpuUsage.push({
                timestamp: Date.now(),
                user: endUsage.user,
                system: endUsage.system
            });
        }, 100);
    }

    // 데이터베이스 작업 모니터링
    async monitorDBOperation(operationName, operation) {
        const startTime = Date.now();
        try {
            const result = await operation();
            const duration = Date.now() - startTime;
            
            this.metrics.operations.push({
                name: operationName,
                duration,
                success: true,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errors.push({
                name: operationName,
                error: error.message,
                duration,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    // 성능 통계 생성
    generateStats() {
        const totalDuration = Date.now() - this.metrics.startTime;
        const successfulOps = this.metrics.operations.filter(op => op.success);
        const failedOps = this.metrics.errors;

        const stats = {
            totalDuration,
            totalOperations: this.metrics.operations.length,
            successfulOperations: successfulOps.length,
            failedOperations: failedOps.length,
            successRate: (successfulOps.length / this.metrics.operations.length * 100).toFixed(2),
            averageResponseTime: successfulOps.length > 0 
                ? (successfulOps.reduce((sum, op) => sum + op.duration, 0) / successfulOps.length).toFixed(2)
                : 0,
            maxResponseTime: successfulOps.length > 0 
                ? Math.max(...successfulOps.map(op => op.duration))
                : 0,
            minResponseTime: successfulOps.length > 0 
                ? Math.min(...successfulOps.map(op => op.duration))
                : 0,
            memoryUsage: this.metrics.memoryUsage.length > 0 
                ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
                : null,
            cpuUsage: this.metrics.cpuUsage.length > 0 
                ? this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1]
                : null
        };

        return stats;
    }

    // 리포트 저장
    saveReport(filename = 'performance-report.json') {
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.generateStats(),
            operations: this.metrics.operations,
            errors: this.metrics.errors,
            memoryUsage: this.metrics.memoryUsage,
            cpuUsage: this.metrics.cpuUsage
        };

        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        console.log(`성능 리포트가 ${filename}에 저장되었습니다.`);
    }

    // 실시간 통계 출력
    printStats() {
        const stats = this.generateStats();
        console.log('\n=== 실시간 성능 통계 ===');
        console.log(`총 실행 시간: ${stats.totalDuration}ms`);
        console.log(`총 작업 수: ${stats.totalOperations}`);
        console.log(`성공률: ${stats.successRate}%`);
        console.log(`평균 응답 시간: ${stats.averageResponseTime}ms`);
        console.log(`최대 응답 시간: ${stats.maxResponseTime}ms`);
        console.log(`최소 응답 시간: ${stats.minResponseTime}ms`);
        
        if (stats.memoryUsage) {
            console.log(`메모리 사용량: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        }
    }
}

module.exports = PerformanceMonitor; 