import React from "react";
import { render } from "react-dom";
import App from "./components/App";
import { RequestOTP } from "./components/input-components/RequestOTP";
import * as logger from "electron-log";
import {ipcRenderer as ipc} from "electron-better-ipc";


// Setup root node where our React app will be attached to
const root = document.createElement("div");

root.id = "root";
document.body.appendChild(root);

logger.transports.console.level = "debug";

ipc.answerMain("get-otp-from-user", async (bookingRequest: any) => {
	render(<RequestOTP bookingRequestId={bookingRequest["bookingRequestId"]} />, document.getElementById("root"));
});

// Render the app component
render(<App />, document.getElementById("root"));
