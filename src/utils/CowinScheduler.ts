import * as logger from "electron-log";
import moment from "moment";
import fastq from "fastq";
import { AxiosResponse } from "axios";

import { requestOTP, bookedSuccessfully } from "../worker/workerWindow";

import CowinService, { Center, Session, DistrictData } from "./CowinService";

import { getCache, setCache } from "../utils/CacheUtils";

logger.transports.console.level = "debug";

export interface Config {
    mobile_no: string;
        
    pincodes: number[];

    district_id: number;

    preferred_vaccines: string[];

    is_paid_ok: boolean;
    slot_number: number;
    
    beneficiaries_ids: string[];
    dose: number;
    age: number;
    
    day_offsets: number[];
    
    default_otp_refresh_freq: number;
    default_private_call_freq: number;
    default_public_call_freq: number;
    default_private_call_freq_while_waiting_for_otp: number;
}

export const DEFAULT_CONFIG: Config = {
    mobile_no: "",
        
    pincodes: [],

    district_id: 392,

    preferred_vaccines:  [
        "COVISHIELD",
        "COVAXIN"
    ],

    is_paid_ok: false,
    slot_number: 2,
    
    beneficiaries_ids: [],
    dose: 1,
    age: 40,
    
    day_offsets: [0, -5, -4, -3, -2, -1, 1],
    
    default_otp_refresh_freq: 14,
    default_private_call_freq: 46,
    default_public_call_freq: 301,
    default_private_call_freq_while_waiting_for_otp: 10,
}

export default class CowinScheduler {
    public config: Config;

    private cowin_service: CowinService;
    private processing_queue: fastq.queue;

    public waiting_for_otp_flag: boolean;

    constructor(config: Config) {
        this.config = config;
        this.cowin_service = new CowinService();
        this.processing_queue = fastq.promise(this, this.queueWorker, 1);
        this.waiting_for_otp_flag = false;
    }

    async init_token(): Promise<void> {
        try {
            const cachedAuth = await getCache(this.config.beneficiaries_ids[0]);
            if(cachedAuth) {
                this.cowin_service.set_auth_info(cachedAuth["auth_token"], cachedAuth["last_login"]);
            } else {
                logger.info("Did not find cached auth token");
            }

        } catch(error) {
            logger.info(error);
        }
    }

    async run(): Promise<void> {

        await this.init_token();

        this.processing_queue.push({is_public: false, day_offset: 0});
    
        let warmUpCounter = 0;
        for (const day_offset of this.config.day_offsets) {
            logger.info(`Scheduling for ${day_offset} in ${warmUpCounter} minutes`);
            setTimeout(() => this.processing_queue.push({is_public: true, day_offset: day_offset}), warmUpCounter * 60 * 1000);
            warmUpCounter += 1;
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async queueWorker(args: any): Promise<any> {
        let nextCallTimeout = args.is_public ? this.config.default_public_call_freq : this.config.default_private_call_freq;
        
        try {
            nextCallTimeout = await this.scheduled_task(args.is_public, args.day_offset);
        } catch (error) {
                logger.info(error);
        }

        if(nextCallTimeout != -1) {
            setTimeout(() => this.processing_queue.push(args), nextCallTimeout * 1000);
        }
    }

    async validateOTP(userOTP: string) {
        try{
            await this.cowin_service.validateMobileOTP(userOTP);

            logger.info(this.config);
            logger.info(this.config.beneficiaries_ids[0]);

            setCache(this.config.beneficiaries_ids[0], {auth_token: this.cowin_service.get_token(), last_login: this.cowin_service.get_last_login()?.valueOf()});    

            this.waiting_for_otp_flag = false;
            this.processing_queue.push({is_public: false, day_offset: 0});

        } catch(otpError) {
            logger.info(otpError);
            this.waiting_for_otp_flag = true;
            requestOTP();    
        }
    }


    async scheduled_task(is_public=true, day_offset=0): Promise<number> {
        logger.info(`Processing task - ${is_public ? "Public" : "Private"} for DayOffset ${day_offset}`);

        if(this.waiting_for_otp_flag) {

            return is_public ? this.config.default_public_call_freq : this.config.default_private_call_freq_while_waiting_for_otp;

        } else {

            if(!this.cowin_service.get_last_login() || moment().diff(this.cowin_service.get_last_login(), "minutes") > this.config.default_otp_refresh_freq) {
                // await API.logout();
    
                await this.cowin_service.generateMobileOTP(this.config.mobile_no);
    
                requestOTP();
    
                this.waiting_for_otp_flag = true;

                return is_public ? this.config.default_public_call_freq : this.config.default_private_call_freq_while_waiting_for_otp;
    
            }

            const district_res = await this.cowin_service.calenderByDistrict(moment().add(day_offset, "days"), this.config.district_id, is_public);
            const avail_obj = await this.check_avail(district_res);
        
            logger.info(avail_obj);
        
            if(avail_obj) {
                const [center, session] = avail_obj;
                const slotIndex = session.slots.length >= this.config.slot_number ? this.config.slot_number - 1 : 0;
                const book_res = await this.cowin_service.schedule(
                    this.config.beneficiaries_ids,
                    center.center_id,
                    this.config.dose, 
                    session.session_id,
                    session.slots[slotIndex]
                );
                if(book_res.data.appointment_confirmation_no) {
                    logger.info("Booked Successfully!!");
                    bookedSuccessfully();
                    // process.exit(0);
                    return -1;
                }
            }
            
            let age = 0;
            if (district_res.headers && district_res.headers["age"] && !isNaN(district_res.headers["age"])) {
                age = parseInt(district_res.headers["age"]);
            }

            return is_public ? this.config.default_public_call_freq - age : this.config.default_private_call_freq;
        }
    }

    async check_avail(district_res: AxiosResponse<DistrictData>): Promise<[Center, Session] | undefined> {
            
        for (const center of district_res.data.centers) {            
            // Check Pincode and Paid/Free
            if (this.config.pincodes.includes(center.pincode) &&
            (center.fee_type == "Free" || this.config.is_paid_ok)) {
                for (const session of center.sessions) {
                    let is_session_applicable = true;
                    
                    // Check Dose Availability
                    if(!((this.config.dose == 1 ? session.available_capacity_dose1 : session.available_capacity_dose2) > 0)) {
                        is_session_applicable = false;
                    }
    
                    // Check Vaccine Type
                    if(is_session_applicable && !this.config.preferred_vaccines.includes(session.vaccine)) {
                        logger.info(`Session Not Applicable Due to Prefered Vaccines: ${session.vaccine}`);
                        is_session_applicable = false;
                    }
                    
                    // Check min age
                    if(is_session_applicable && session.min_age_limit && session.min_age_limit > this.config.age) {
                        logger.info(`Session Not Applicable Due to Min Age Limit: ${session.min_age_limit}`);
                        is_session_applicable = false;
                    }
                    
                    // Check max age
                    if(is_session_applicable && session.max_age_limit && session.max_age_limit < this.config.age) {
                        logger.info(`Session Not Applicable Due to Max Age Limit: ${session.max_age_limit}`);
                        is_session_applicable = false;
                    }
                    
                    if (is_session_applicable) {
                        return [center, session];
                    }
                }
            }
        }
    
        return;
    }
    
}