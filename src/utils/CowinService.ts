import axios, { AxiosInstance, AxiosResponse } from "axios";
import moment, {Moment} from "moment";
import { createHash } from "crypto";

// export type Dose = 1 | 2;

export interface Session {
    session_id: string;
    date: string;
    available_capacity: number;
    min_age_limit?: number;
    max_age_limit?: number;
    allow_all_age: boolean;
    vaccine: string;
    slots: string[];
    available_capacity_dose1: number;
    available_capacity_dose2: number;
}

export interface VaccineFees {
    vaccine: string;
    fee: string;
}

export interface Center {
    center_id: number;
    name: string;
    address: string;
    state_name: string;
    district_name: string;
    block_name: string;
    pincode: number;
    lat: number;
    long: number;
    from: string;
    to: string;
    fee_type: string;
    sessions: Session[];
    vaccine_fees: VaccineFees[];
}

export interface PincodeData {
    centers: Center[];
}

export interface DistrictData {
    centers: Center[];
}

export interface Appointment {
    appointment_id: string;
    center_id: string;
    name: string;
    state_name: string;
    district_name: string;
    block_name: string;
    from: string;
    to: string;
    dose: string;
    session_id: string;
    date: string;
    slot: string;
}

export interface Beneficiary {
    beneficiary_reference_id: string;
    name: string;
    birth_year: string;
    gender: string;
    mobile_number: string;
    photo_id_type: string;
    photo_id_number: string;
    comorbidity_ind: string;
    vaccination_status: string;
    vaccine: string;
    dose1_date: string;
    dose2_date: string;
    appointments: Appointment[];
}

export interface BeneficiariesData {
    beneficiaries: Beneficiary[];
}

export interface GenerateOTPData {
    txnId: string;
}

export interface ValidateOTPData {
    token: string;
    isNewAccount: string;
}

export interface ScheduleData {
    appointment_confirmation_no: string;
}

export default class CowinService {
    private axios_instance: AxiosInstance;

    private txnId?: string;
    private token?: string;
    private last_login?: Moment;

    // Date Format for API
    private static DATE_FORMAT = "DD-MM-YYYY";

    // API
    private static BASE_URL = "https://cdn-api.co-vin.in";
    // Public Endpoints
    private static PUBLIC_DISTRICT_URL = "/api/v2/appointment/sessions/public/calendarByDistrict";
    private static PUBLIC_PINCODE_URL = "/api/v2/appointment/sessions/public/calendarByPin";
    // OTP
    private static GENERATE_OTP_URL = "/api/v2/auth/generateMobileOTP";
    private static VALIDATE_OTP_URL = "/api/v2/auth/validateMobileOtp";
    // Private Endpoints
    private static DISTRICT_URL = "/api/v2/appointment/sessions/calendarByDistrict";
    private static PINCODE_URL = "/api/v2/appointment/sessions/calendarByPin";
    private static BENEFICIARIES_URL = "/api/v2/appointment/beneficiaries";
    private static BOOK_URL = "/api/v2/appointment/schedule";
    private static LOGOUT_URL = "/api/v2/auth/logout";

    private static SECRET = "U2FsdGVkX1+DZA3IkU8x/STNFCccdH00zzSmPCBnmMBMplKuXv1Z8ezFPVikYxpKW9j28SmCZlnyIMnynlj6HQ==";


    constructor() {
        this.axios_instance = axios.create({
            baseURL: CowinService.BASE_URL,
            timeout: 120000,
            headers: {
                "accept": "application/json",
                "Accept-Language": "en_US",
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36"
            }
        });
    }

    get_txnId(): string | undefined {
        return this.txnId;
    }

    get_token(): string | undefined {
        return this.token;
    }

    get_last_login(): Moment | undefined {
        return this.last_login;
    }

    set_auth_info(auth_token: string, last_login_value: string): void {
        this.token = auth_token;
        this.last_login = moment(last_login_value);
    }

    async calenderByPin(date: Moment, pincode: number, is_public = true): Promise<AxiosResponse<PincodeData>> {
        const url = is_public ? CowinService.PUBLIC_PINCODE_URL : CowinService.PINCODE_URL;
        return await this.axios_instance.get<PincodeData>(
            url.replace("{0}", date.format(CowinService.DATE_FORMAT)).replace("{1}", String(pincode)),
            {
                params: {
                    "pincode": pincode,
                    "date": date.format(CowinService.DATE_FORMAT)
                },
                headers: is_public ? undefined :  { "authorization": `Bearer ${this.token}` }
            }
        );
    }

    async calenderByDistrict(date: Moment, district_id: number, is_public = true): Promise<AxiosResponse<DistrictData>> {
        const url = is_public ? CowinService.PUBLIC_DISTRICT_URL : CowinService.DISTRICT_URL;
        return await this.axios_instance.get<DistrictData>(
            url.replace("{0}", date.format(CowinService.DATE_FORMAT)).replace("{1}", String(district_id)),
            {
                params: {
                    "district_id": district_id,
                    "date": date.format(CowinService.DATE_FORMAT)
                },
                headers: is_public ? undefined :  { "authorization": `Bearer ${this.token}` }
            }
        );
    }

    async generateMobileOTP(mobile_no: string): Promise<AxiosResponse<GenerateOTPData>> {
        if(this.txnId) {
            // Throw meaningfull exception
        }

        const response =  await this.axios_instance.post<GenerateOTPData>(
            CowinService.GENERATE_OTP_URL,
            {
                mobile: mobile_no,
                secret: CowinService.SECRET
            }
        );
        this.txnId = response.data["txnId"];
        return response;
    }
        
    async validateMobileOTP(otp: string): Promise<AxiosResponse<ValidateOTPData>> {
        if(!this.txnId) {
            // Throw meaningfull exception
        }
        const otp_hash = createHash("sha256").update(otp).digest("hex");
        const response = await this.axios_instance.post<ValidateOTPData>(
            CowinService.VALIDATE_OTP_URL,
            {
                otp: otp_hash,
                txnId: this.txnId
            }
        );
        
        this.txnId = undefined;
        this.last_login = moment();
        this.token = response.data["token"];

        return response;
    }

    async beneficiaries(): Promise<AxiosResponse<BeneficiariesData>> {
        if(!this.token) {
            // Throw meaningfull exception
        }
        return await this.axios_instance.get(
            CowinService.BENEFICIARIES_URL,
            {
                headers: {
                    "content-type": "application/json",
                    "authorization": `Bearer ${this.token}`
                }
            }
        );
    }

    async schedule(beneficiaries: string[], center_id: number, dose: number, session_id: string, slot: string): Promise<AxiosResponse<ScheduleData>> {
        if(!this.token) {
            // Throw meaningfull exception
        }
        return await this.axios_instance.post<ScheduleData>(
            CowinService.BOOK_URL,
            {
                "beneficiaries": beneficiaries,
                "center_id": center_id,
                "dose": dose,
                "session_id": session_id,
                "slot": slot
            },
            {
                headers: {
                    "content-type": "application/json",
                    "authorization": `Bearer ${this.token}`
                }
            }
        );
    }

    async logout(): Promise<AxiosResponse<any>> {
        if(!this.token) {
            // Throw meaningfull exception
        }
        const response = await this.axios_instance.get(
            CowinService.LOGOUT_URL,
            {
                headers: {
                    "authorization": `Bearer ${this.token}`
                }
            }
        );
        this.txnId = undefined;
        this.token = undefined;
        return response;
    }
}