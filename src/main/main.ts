import { app, BrowserWindow, dialog } from "electron";
import * as path from "path";
import * as url from "url";
import {ipcMain as ipc} from "electron-better-ipc";
import * as logger from "electron-log";
import Store from "electron-store";
import { BookingRequest, BookingRequestContext } from "../models/BookingRequestContext";

let mainWindow!: Electron.BrowserWindow;

const bookingRequests = new Map<string, BookingRequest>();

const cacheStorage: Store = new Store({
  name: "cowin-app-cache",
  cwd: app.getAppPath()
});

ipc.answerRenderer('request-otp', async(eventArgs: any) => {
  ipc.callRenderer(mainWindow, 'get-otp-from-user', {bookingRequestId: eventArgs["bookingRequestId"]});
  return {ok: true};  
});

ipc.answerRenderer('otp-response', async(eventArgs: any) => {
  logger.info(eventArgs);
  const workerWindow = bookingRequests.get(eventArgs["bookingRequestId"])?.workerWindow;
  logger.info(workerWindow);  
  if(workerWindow) {
    ipc.callRenderer(workerWindow, 'validate-otp', eventArgs);
  }  
  return {ok: true};  
});

ipc.answerRenderer('get-cache-value', async (eventArgs: string)=>{
  return cacheStorage.get(eventArgs, undefined);
});

ipc.answerRenderer('set-cache-value', async (eventArgs: any)=>{
  cacheStorage.set(eventArgs.key, eventArgs.value);
  return {ok: true};
});

ipc.answerRenderer('business-event', async (eventArgs)=>{
  logger.info(eventArgs);
  
  return {ok: true};
});

function createWindow() {

  logger.transports.console.level = "debug";

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: "#f2f2f2",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV !== "production",
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:4000/");
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "renderer/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }

  mainWindow.on("close", (e) => {
    const closeConfirmation = dialog.showMessageBoxSync({
      message: "Closing the app will stop all the booking requests. Do you want to exit the application?",
      type: "warning",
      buttons: ["Cancel", "Close and Exit"],
      defaultId: 0,
      title: "Confirm Close"
    });
    if(closeConfirmation != 1) {
      e.preventDefault();
    } else {
      bookingRequests.forEach(bookingRequest => {
        try {
          bookingRequest.workerWindow.close();
        } catch (error) {
          logger.debug(error);
        }
      });
    }
  });

  mainWindow.on("closed", () => {
    app.exit(0);
  });

  createWorkerWindow();
}

function createWorkerWindow() { 

  logger.transports.console.level = "debug";

  const workerWindow: BrowserWindow | null = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: "#f2f2f2",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: process.env.NODE_ENV !== "production",
    },
  });


  if (process.env.NODE_ENV === "development") {
    workerWindow.loadURL("http://localhost:4000/worker.html");
  } else {
    workerWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "renderer/worker.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }
  
  const newBookingRequestContext = new BookingRequestContext({
    pincodes: [421002,421004],
    isPaidOk: false,
    vaccineTypes: ["COVISHIELD","COVAXIN"],
    mobileNumber!: "9821309542",
    requestedBeneficiary: {
        "beneficiary_reference_id": "15969211687040",
        "name": "Rutesh Rupchand Makhijani",
        "birth_year": "1977",
        "gender": "Male",
        "mobile_number": "9542",
        "photo_id_type": "Aadhaar Card",
        "photo_id_number": "XXXXXXXX5438",
        "comorbidity_ind": "N",
        "vaccination_status": "Not Vaccinated",
        "vaccine": "",
        "dose1_date": "",
        "dose2_date": "",
        "appointments": []
    }
  });

  const newBookingRequest = new BookingRequest({
    bookingRequestContext: newBookingRequestContext,
    uiWindow: mainWindow,
    workerWindow: workerWindow
  });

  bookingRequests.set(newBookingRequest.bookingRequestContext.bookingRequestId, newBookingRequest);
  
  workerWindow.webContents.once("did-finish-load", (async () => {
    const loadResponse = await ipc.callRenderer(workerWindow,"initialize-booking-process", newBookingRequest.bookingRequestContext);
    logger.info(loadResponse);
  }));

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.allowRendererProcessReuse = true;
