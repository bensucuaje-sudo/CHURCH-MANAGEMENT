/**
 * Utility for Google Drive operations using the Google Drive API v3.
 */

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export const listBackupFiles = async (accessToken: string): Promise<DriveFile[]> => {
  const query = encodeURIComponent("name contains 'sda_treasury_backup_' and mimeType = 'application/json'");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list files from Google Drive');
  }

  const data = await response.json();
  return data.files || [];
};

export const uploadBackup = async (accessToken: string, fileName: string, data: any) => {
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append(
    'file',
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  );

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Upload error:', error);
    throw new Error('Failed to upload backup to Google Drive');
  }

  return await response.json();
};

export const downloadBackup = async (accessToken: string, fileId: string): Promise<any> => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download backup from Google Drive');
  }

  return await response.json();
};

export const deleteBackup = async (accessToken: string, fileId: string) => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete file from Google Drive');
  }
};
