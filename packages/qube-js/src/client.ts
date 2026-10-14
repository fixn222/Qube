import { QubeDb } from "./db";
import { QubeRealTime } from "./realtime";
import { QubeAuth } from "./auth";
import { QubeStorage } from "./storage";



export class QubeClient {
    readonly db : QubeDb ;
    readonly realTime : QubeRealTime ;
    readonly auth : QubeAuth ;
    readonly storage : QubeStorage;


    constructor(
        private projectUrl : string ,
        private apiKey : string
    ) {

        this.db = new QubeDb( projectUrl ,apiKey);
        this.auth = new QubeAuth(projectUrl);
        this.realTime = new QubeRealTime(projectUrl, apiKey);
        this.storage = new QubeStorage(projectUrl , apiKey);
 
    }


   from<T = Record<string , unknown>>(table:string){
    return this.db.from<T>(table);
   }


}