import { input } from '@inquirer/prompts';
import {
  existsSync,
  mkdirSync,
} from 'fs';
import { resolve } from 'path';
import { FolderAPI } from './dlALLFile';
import { check } from './check';

import logger from './logger';

const aaaaa = async () => {
  if (!existsSync(resolve('.cache', 'APIToken.json'))) {
    logger.warn('你尚未提供存取權限，請先執行此命令\n$ bun ./src/oAuth.ts');
    return;
  }
  const answer = await input({ message: 'drive URL:' });

  const folderid = answer.split('/')[5].trim();

  if (!existsSync(resolve('.cache', 'APIToken.json'))) {
    logger.warn('你尚未提供存取權限，請先執行此命令\n$ bun ./src/oAuth.ts');
    return;
  }

  const drive = new FolderAPI(folderid);
  logger.info('👾 以下是抓到的資料');
  await drive.listFilesInFolder();

  const path = await input({ message: '🔨 請輸入要下載到的路徑(./)' });

  await drive.downloadFilesInFolder(path);

  const JudgeInput = await input({ message: 'Sample Input' });
  const JudgeOutput = await input({ message: 'Sample Output' });

  await check(JudgeInput, JudgeOutput, path);
};

const existsCacheFile = () => {
  const path = resolve('.cache/');
  if (existsSync(path)) return;
  logger.info('已建立快取資料夾');
  mkdirSync('.cache', { recursive: true });
};

existsCacheFile();
await aaaaa();
