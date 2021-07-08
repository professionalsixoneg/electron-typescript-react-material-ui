import * as logger from "electron-log";
import {ipcRenderer as ipc} from "electron-better-ipc";

export async function setCache(key: string, value: any): Promise<any> {
	return new Promise((resolve, reject) => {		
		ipc.callMain("set-cache-value",{key: key, value: value})
		.then((setResponse) => {			
			resolve(setResponse);
		}).catch((setError) => {
			logger.debug("Problem in setting Cache");
			logger.debug(setError);
			reject(setError)
		});
	});	
}


export async function getCache(key: string): Promise<any> {
	return new Promise((resolve, reject) => {		
		ipc.callMain("get-cache-value", key)
		.then((getResponse) => {			
			resolve(getResponse);
		}).catch((getError) => {
			logger.debug("Problem in getting Cache");
			logger.debug(getError);
			reject(getError)
		});
	});	
}

