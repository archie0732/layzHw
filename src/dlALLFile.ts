import { google, drive_v3 } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import logger from './logger';

export interface APICretentials {
  installed: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

export class FolderAPI {
  folderId: string;
  private oAuth2Client: OAuth2Client;
  private drive: drive_v3.Drive;

  constructor(folderId: string) {
    this.folderId = folderId;

    const credentials = JSON.parse(
      readFileSync(resolve('getToken.json'), 'utf-8'),
    ) as APICretentials;
    const { client_id, client_secret, redirect_uris } = credentials.installed;

    this.oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );

    const token = JSON.parse(
      readFileSync(resolve('.cache', 'APIToken.json'), 'utf-8'),
    ) as Credentials;
    this.oAuth2Client.setCredentials(token);

    this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
  }

  public listFilesInFolder = async () => {
    try {
      const res = await this.drive.files.list({
        q: `'${this.folderId}' in parents`,
        fields: 'nextPageToken, files(id, name)',
      });

      if (res.data.files && res.data.files.length > 0) {
        res.data.files.forEach((file) => {
          logger.info(`${file.name} (${file.id})`);
        });
      }
      else {
        logger.error('😅 未找到任何自資料於資料夾內');
      }
    }
    catch (error) {
      logger.error(`💀 發生錯誤:`, void error);
      process.exit(1);
    }
  };

  public downloadFilesInFolder = async (downloadPath: string) => {
    try {
      const res = await this.drive.files.list({
        q: `'${this.folderId}' in parents`,
        fields: 'files(id, name)',
      });

      if (res.data.files && res.data.files.length > 0) {
        if (!existsSync(downloadPath)) {
          mkdirSync(downloadPath, { recursive: true });
        }

        for (const file of res.data.files) {
          if (!file.id || !file.name) continue;
          await this.downloadFile(
            file.id,
            resolve(downloadPath, file.name.split('-')[0] + '.cpp'),
          );
        }
      }
      else {
        logger.error('😅 位在資料夾內找到任何檔案');
      }
    }
    catch (error) {
      logger.error('💀 下載檔案時發生錯誤:', error);
    }
  };

  private async downloadFile(fileId: string, destPath: string) {
    try {
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        { responseType: 'stream' },
      );

      const data = await new Response(response.data).arrayBuffer();

      writeFileSync(destPath, new Uint8Array(data));
    }
    catch (error) {
      logger.error('Error downloading file:', error);
    }
  };
}
