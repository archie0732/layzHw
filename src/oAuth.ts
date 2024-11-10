import express from 'express';
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import logger from './logger';

import type { Request, Response } from 'express';

export const oAuth = async () => {
  const app = express();
  const PORT = 3000;

  const credentials = JSON.parse(
    readFileSync(resolve('getToken.json'), 'utf-8'),
  );
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  logger.info(`🔍點擊下方 URL 以驗證並存取 Google Drive 資料夾\n${authUrl}`);

  app.get('/oauth2callback', async (req: Request, res: Response) => {
    const code = req.query['code'] as string;
    if (!code) {
      res.send('No code found');
      return;
    }

    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      writeFileSync(resolve('.cache', 'APIToken.json'), JSON.stringify(tokens));

      res.send(`
        <html>
          <body>
            <h1>Authentication successful! You can close this tab.</h1>
            <a href="https://ibb.co/Kq1Bqr7">
              <img src="https://i.ibb.co/Kq1Bqr7/Screenshot-2024-05-20-15-24-58-754-com-miui-videoplayer-edit.jpg" alt="Screenshot-2024-05-20-15-24-58-754-com-miui-videoplayer-edit" border="0">
            </a>
          </body>
        </html>
      `);

      logger.info(
        '🎉 已將 token 存入 .cache/APIToken.json\n👾 使用以下指令來啟動程式\nbun ./src/index.ts',
      );

      setTimeout(() => process.exit(0), 3_000);
    }
    catch (error) {
      logger.error('💀 發生錯誤:', error);
      res.send('💀 Error retrieving access token');
    }
  });

  app.listen(PORT, () => {
    logger.info(`已架設伺服器並執行於: http://localhost:${PORT}`);
  });
};

oAuth();
