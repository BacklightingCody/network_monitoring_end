@echo off
echo 测试网络流量监控接口

echo.
echo --- 测试: 基本查询 ---
curl "http://localhost:5000/traffic/packets?page=1&limit=5" -s | echo.

echo.
echo --- 测试: 正确的时间格式 ---
curl "http://localhost:5000/traffic/packets?page=1&limit=5&startTime=2023-01-01T00:00:00.000Z&endTime=2023-12-31T23:59:59.999Z" -s | echo.

echo.
echo --- 测试: 完整参数查询 ---
curl "http://localhost:5000/traffic/packets?page=1&limit=5&protocol=TCP&sourceIp=192.168.1.1" -s | echo.

echo.
echo --- 测试: 流量统计 ---
curl "http://localhost:5000/traffic/stats" -s | echo.

echo.
echo --- 测试: 异常记录 ---
curl "http://localhost:5000/traffic/anomalies" -s | echo.

echo.
echo 测试完成
pause 