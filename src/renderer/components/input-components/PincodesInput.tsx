import { TextField } from "@material-ui/core";
import React from "react";

export class PincodesInput extends React.Component
{

    state = {pincodes: '', isValid: true};

    handleChangePincodes = (changeEvent: any): any => {
        this.setState({pincodes: changeEvent.target.value});      
        if(!this.state.isValid) {
            this.setState({isValid: changeEvent.target.value.match(/^(\d{6})([,]\d{6})*$/) != null});
        }  
    }

    handleValidatePincodes = (changeEvent: any): any => {
        if(changeEvent.target.value.match(/^(\d{6})([,]\d{6})*$/) != null) {
            this.setState({pincodes: changeEvent.target.value, isValid: true});
        } else {
            this.setState({pincodes: changeEvent.target.value, isValid: false});
        }
    }

    render(): JSX.Element {
        return (
            <TextField variant="outlined"
                       label="Pincodes"
                       margin="normal"
                       required                       
                       value={this.state.pincodes} 
                       onChange={this.handleChangePincodes} onBlur={this.handleValidatePincodes} 
                       error={!this.state.isValid} helperText={!this.state.isValid?"Invalid pincodes":""}></TextField>
        );
    }
}