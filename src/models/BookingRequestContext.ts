import {v4 as uuidv4} from "uuid";

class BookingRequestContext {    

    public bookingRequestId: string;
    public pincodes!: number[];
    public isPaidOk!: boolean;
    public vaccineTypes!: string[];
    public mobileNumber!: string;
    public beneficiaries = [];
    public requestedBeneficiary: any;
    public isBookedFlag!: boolean;
    public authToken!: string;
    public tokenTime!: string;
    public requestOtpFlag!: boolean;

    public constructor(initialValues: any = {}) {
        Object.assign(this, initialValues);
        this.bookingRequestId = uuidv4();
       
    }
}

class BookingRequest {
    
    public bookingRequestContext!: BookingRequestContext;
    public uiWindow!: Electron.BrowserWindow;
    public workerWindow!: Electron.BrowserWindow;

    public constructor(initialValues: any = {}) {
        Object.assign(this, initialValues);       
    }
}

export { BookingRequestContext, BookingRequest };