import { google } from 'googleapis';
import { readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { resolve } from 'path';
import logger from './logger';

export class FolderAPI {
  folderId: string;
  private oAuth2Client: any;
  private drive: any;

  constructor(folderId: string) {
    this.folderId = folderId;

    const credentials = JSON.parse(
      readFileSync(resolve('getToken.json'), 'utf-8'),
    );
    const { client_id, client_secret, redirect_uris } = credentials.installed;

    this.oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );

    const token = JSON.parse(
      readFileSync(resolve('.cache', 'APIToken.json'), 'utf-8'),
    );
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
        res.data.files.forEach((file: any) => {
          logger.info(`${file.name} (${file.id})`);
        });
      }
      else {
        logger.error('😅 未找到任何自資料於資料夾內');
      }
    }
    catch (error) {
      logger.error(`💀 發生錯誤:`, error);
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
          await this.downloadFile(file.id, resolve(downloadPath, file.name.split('-')[0] + '.cpp'));
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

  private downloadFile = async (fileId: string, destPath: string) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const res = await this.drive.files.get(
          {
            fileId: fileId,
            alt: 'media',
          },
          { responseType: 'stream' },
        );

        const fileStream = createWriteStream(destPath);

        res.data
          .pipe(fileStream)
          .on('finish', () => {
            logger.debug(`Downloaded ${destPath}`);
            resolve();
          })
          .on('error', (err: any) => {
            logger.error('Download error:', err);
            reject(err);
          });
      }
      catch (error) {
        logger.error('Error downloading file:', error);
        reject(error);
      }
    });
  };
}
