export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: ProcessingStatus;
  result?: string;
  error?: string;
  progress: number;
  originalName: string;
  size: number;
}

export interface BulkJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  processed: number;
  files: BulkFileItem[];
  createdAt: string;
}

export interface BulkFileItem {
  id: string;
  name: string;
  status: ProcessingStatus;
  originalUrl: string;
  resultUrl?: string;
  error?: string;
}

export interface BeforeAfterData {
  original: string;
  processed: string;
}

export interface BackgroundOptions {
  type: "transparent" | "color" | "blur" | "image";
  color?: string;
  blurRadius?: number;
  imageUrl?: string;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    shadow?: number;
  };
}

export interface UserStats {
  totalImages: number;
  totalProcessed: number;
  creditsUsed: number;
  creditsRemaining: number;
  storageUsed: number;
}

export interface AdminStats {
  totalUsers: number;
  totalImages: number;
  totalProcessed: number;
  storageUsed: number;
  dailyUploads: { date: string; count: number }[];
  popularFormats: { format: string; count: number }[];
  recentUploads: number;
}

export interface EditorState {
  imageId?: string;
  originalUrl: string;
  processedUrl?: string;
  background: BackgroundOptions;
  zoom: number;
  crop?: CropData;
  isProcessing: boolean;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextOverlay {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
  shadow: boolean;
  rotation: number;
  width: number;
  height: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  isPopular?: boolean;
  priceId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
