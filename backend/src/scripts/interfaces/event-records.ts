import {TimeFormat} from "../constants/time-formats.js";
import {ResultFormatMap} from "./result-format.js";

export type EventRecords<T extends TimeFormat> = ResultFormatMap[T];
