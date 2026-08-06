import axios from "axios";


const apiClient = axios.create({
    baseURL : process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ,
    withCredentials : true 
});

export default apiClient;