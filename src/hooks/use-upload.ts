'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

type UploadFolder = 'avatars' | 'images' | 'videos' | 'audios' | 'voices' | 'files';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function getFolder(mimeType: string): UploadFolder {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audios';
  return 'files';
}

function getMessageType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    folder?: UploadFolder,
  ): Promise<{ fileUrl: string; messageType: string } | null> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const targetFolder = folder ?? getFolder(file.type);

      const res = await api.post<PresignedUrlResponse>('/upload/presigned-url', {
        filename: file.name,
        contentType: file.type,
        folder: targetFolder,
      });

      setProgress(30);

      await fetch(res.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setProgress(100);

      return {
        fileUrl: res.data.fileUrl,
        messageType: getMessageType(file.type),
      };
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return { uploadFile, isUploading, progress };
}
