import { Controller, Get, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TopologyService } from './topology.service';
import { NodeDetails, TopologyData } from './dto/topology.dto';

@Controller('topology')
export class TopologyController {
  constructor(private readonly topologyService: TopologyService) {}

  /**
   * 获取网络拓扑图数据
   * @param startTime 开始时间（可选）
   * @param endTime 结束时间（可选）
   * @returns 网络拓扑数据
   */
  @Get()
  async getNetworkTopology(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<TopologyData> {
    try {
      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.topologyService.getNetworkTopology(timeRange);
    } catch (error) {
      console.error('获取网络拓扑图失败:', error);
      throw new HttpException(
        `获取网络拓扑图失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取节点详细信息
   * @param nodeId 节点ID（IP地址）
   * @param startTime 开始时间（可选）
   * @param endTime 结束时间（可选）
   * @returns 节点详细信息
   */
  @Get('node/:nodeId')
  async getNodeDetails(
    @Param('nodeId') nodeId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<NodeDetails> {
    try {
      if (!nodeId) {
        throw new HttpException(
          '节点ID不能为空',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.topologyService.getNodeDetails(nodeId, timeRange);
    } catch (error) {
      console.error(`获取节点 ${nodeId} 详情失败:`, error);
      throw new HttpException(
        `获取节点详情失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 辅助方法：解析时间范围
   * @param startTime 开始时间字符串
   * @param endTime 结束时间字符串
   * @returns 时间范围对象或undefined
   */
  private getTimeRange(startTime?: string, endTime?: string) {
    if (!startTime && !endTime) return undefined;
    
    const timeRange: any = {};
    if (startTime) timeRange.start = new Date(startTime);
    if (endTime) timeRange.end = new Date(endTime);
    return timeRange;
  }
} 