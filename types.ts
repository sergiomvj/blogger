
export enum Screen {
  DASHBOARD = 'DASHBOARD',
  QUEUE = 'QUEUE',
  JOB_DETAILS = 'JOB_DETAILS',
  SETTINGS = 'SETTINGS',
  UPLOAD = 'UPLOAD',
  COSTS = 'COSTS',
  BLOGS = 'BLOGS',
  PRESETS = 'PRESETS',
  MEDIA = 'MEDIA',
  NEW_ARTICLE = 'NEW_ARTICLE',
  PRE_ARTICLE_REVIEW = 'PRE_ARTICLE_REVIEW',
  ARTICLES = 'ARTICLES'
}

export type JobStatus = 'Running' | 'Failed' | 'Needs Review' | 'Published' | 'Queued' | 'Processing' | 'processing' | 'failed' | 'published' | 'queued' | 'review';

export interface Job {
  id: string;
  title: string;
  site: string;
  category: string;
  status: JobStatus;
  progress?: number;
  timestamp: string;
  icon?: string;
  wp_post_id?: string | number;
  wp_post_url?: string;
  last_error?: string;
}

export interface Stat {
  label: string;
  value: string;
  trend?: string;
  icon: string;
  color: string;
}

export interface LogEntry {
  time: string;
  level: 'Success' | 'Info' | 'Warn' | 'Error';
  message: string;
}
