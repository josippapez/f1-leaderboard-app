/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import MenuBuilder from './menu';
import { start, stop } from './standings';
import { resolveHtmlPath } from './util';

const ProgressBar = require('electron-progressbar');

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();
  }
}

let mainWindow: BrowserWindow | null = null;

app.commandLine.appendSwitch('remote-debugging-port', '9222');

ipcMain.on('app-version', (event) => {
  event.reply('app-version', { version: app.getVersion() });
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      start();
      require('./standings');
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    stop();
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// Auto updater events (optional)
let progressBar: typeof ProgressBar | null = null;
autoUpdater.on('update-available', (ev, info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Found Updates',
      message: `Found updates, do you want update now?`,
      buttons: ['Sure', 'No'],
    })
    .then((res) => {
      if (res.response === 0) {
        autoUpdater.downloadUpdate();
      }
    })
    .catch((error) => dialog.showErrorBox('Error', error));
});
autoUpdater.on('update-not-available', (ev, info) => {});
autoUpdater.on('error', (ev, err) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Error',
    message: `Error, while checking for updates. ${err}`,
  });
});
autoUpdater.on('download-progress', (progressObj) => {
  const logMessage = `Downloading ${Math.round(progressObj.percent)}%`;
  if (progressBar === null) {
    progressBar = new ProgressBar({
      indeterminate: false,
      text: 'Downloading new version...',
      detail: 'Wait...',
    });
  } else {
    progressBar.value = progressObj.percent;
    progressBar.detail = logMessage;
  }
});
autoUpdater.on('update-downloaded', (ev, info) => {
  // Wait 5 seconds, then quit and install
  // In your application, you don't need to wait 5 seconds.
  // You could call autoUpdater.quitAndInstall(); immediately
  dialog.showMessageBoxSync({
    type: 'info',
    title: 'Update downloaded',
    message: 'Update downloaded, application will quit for update...',
  });
  autoUpdater.quitAndInstall();
});

if (progressBar) {
  progressBar
    .on('completed', () => {
      progressBar.detail = 'Task completed. Exiting...';
    })
    .on('aborted', (value: string) => {
      console.info(`aborted... ${value}`);
    })
    .on('progress', (value: number) => {
      progressBar.detail = `Value ${value} out of ${
        progressBar.getOptions().maxValue
      }...`;
    });
}
