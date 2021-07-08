import * as logger from "electron-log";
import {ipcRenderer as ipc} from "electron-better-ipc";
import { BookingRequestContext } from "../models/BookingRequestContext";
import CowinScheduler, { Config as SchedulerConfig, DEFAULT_CONFIG } from "../utils/CowinScheduler";
import moment from "moment";
logger.transports.console.level = "debug";

let bookingRequestContext!: BookingRequestContext;

let schedulerWorker!: CowinScheduler;

ipc.answerMain("initialize-booking-process", async (initializeContext: BookingRequestContext) => {
	bookingRequestContext = initializeContext;

	const workerConfig: SchedulerConfig = {
		...DEFAULT_CONFIG,
		mobile_no: bookingRequestContext.mobileNumber,
		pincodes: bookingRequestContext.pincodes,
		preferred_vaccines: bookingRequestContext.vaccineTypes,
		is_paid_ok: bookingRequestContext.isPaidOk,
		beneficiaries_ids: [bookingRequestContext.requestedBeneficiary["beneficiary_reference_id"]],
		age:  moment().year() - parseInt(bookingRequestContext.requestedBeneficiary["birth_year"]),
		dose: bookingRequestContext.requestedBeneficiary["dose1_date"] === "" ? 1 : 2
	}

	schedulerWorker = new CowinScheduler(workerConfig);
	
	schedulerWorker.run();

	return {workerInitialize: true};
});

ipc.answerMain("validate-otp", async (otpResponse: any) => {
	schedulerWorker.validateOTP(otpResponse["otp"]);
	return {ok: true};
});

export async function requestOTP(): Promise<any> {
	return new Promise((resolve, reject) => {		
		ipc.callMain("request-otp",{bookingRequestId: bookingRequestContext.bookingRequestId})
		.then((otpResponse) => {			
			resolve(otpResponse);
		}).catch((otpError) => {
			reject(otpError)
		});
	});	
}

export async function bookedSuccessfully(): Promise<any> {
	return new Promise((resolve, reject) => {		
		ipc.callMain("booked-successfully",{bookingRequestId: bookingRequestContext.bookingRequestId})
		.then((ipcResponse) => {			
			resolve(ipcResponse);
		}).catch((ipcError) => {
			reject(ipcError)
		});
	});	
}