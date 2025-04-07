import { Injectable } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class CaptureConfig {
  tsharkPath: string = process.env.TSHARK_PATH || `"D:\\Wireshark\\tshark.exe"`;
  defaultInterface: string = process.env.DEFAULT_INTERFACE || '5'; // WLAN
  defaultDuration: number = parseInt(process.env.DEFAULT_DURATION, 10) || 300;
  jsonFilePath: string = process.env.JSON_FILE_PATH || path.resolve(process.cwd(), 'tmp', 'packets.json');
  batchSize: number = parseInt(process.env.BATCH_SIZE, 10) || 1000;
  defaultFields: string[] = [
    'frame.number',
    'frame.time',
    'eth.src',
    'eth.dst',
    'ip.src',
    'ip.dst',
    'tcp.srcport',
    'tcp.dstport',
    'udp.srcport',
    'udp.dstport',
    'ip.proto',
    'frame.len',
    'tcp.flags',
  ];
}