import axios from "axios";

export default axios.create({
  baseURL: process.env.API_HOST as string,
  headers: {
    "Content-type": "application/json",
    Authorization: process.env.API_BOT_AUTH_CODE,
  },
});
