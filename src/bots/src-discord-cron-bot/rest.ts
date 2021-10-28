import axios from "axios";

export default axios.create({
  baseURL: process.env.API_HOST as string,
  headers: {
    "Content-type": "application/json",
  },
});
