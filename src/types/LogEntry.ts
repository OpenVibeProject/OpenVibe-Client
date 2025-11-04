import { LogLevel } from "./LogLevel";

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
}
