import { TextField, Button } from "@material-ui/core";
import React from "react";
import * as logger from "electron-log";
import {ipcRenderer as ipc} from "electron-better-ipc";

logger.transports.console.level = "debug";

export type RequestOTPProps = {
    bookingRequestId: string;
}

export type RequestOTPState = {
    otp: string, 
    isValid: boolean
}

export class RequestOTP extends React.Component<RequestOTPProps, RequestOTPState>
{
    constructor(props: RequestOTPProps) {
        super(props);
        this.state = {otp: "", isValid: true};
    }

    handleChangeOTP = (changeEvent: any): any => {
        this.setState({otp: changeEvent.target.value});      
        if(!this.state.isValid) {
            this.setState({isValid: changeEvent.target.value.match(/^(\d{6})*$/) != null});
        }  
    }

    handleValidateOTP = (changeEvent: any): any => {
        if(changeEvent.target.value.match(/^(\d{6})*$/) != null) {
            this.setState({otp: changeEvent.target.value, isValid: true});
        } else {
            this.setState({otp: changeEvent.target.value, isValid: false});
        }
    }

    handleSubmitOTP = (): any => {
        logger.debug({bookingRequestId: this.props.bookingRequestId ,otp: this.state.otp});
        ipc.callMain('otp-response',{bookingRequestId: this.props.bookingRequestId ,otp: this.state.otp});
    }

    render(): JSX.Element {
        return (
            <div>
                <TextField variant="outlined"
                        label="OTP"
                        margin="normal"
                        required                       
                        value={this.state.otp} 
                        onChange={this.handleChangeOTP} onBlur={this.handleValidateOTP} 
                        error={!this.state.isValid} helperText={!this.state.isValid?"Invalid OTP":""}></TextField>
                <Button variant="contained" 
                        color="primary"
                        onClick={this.handleSubmitOTP}
                        disabled={!this.state.isValid}>Validate OTP</Button>
            </div>
        );
    }
}