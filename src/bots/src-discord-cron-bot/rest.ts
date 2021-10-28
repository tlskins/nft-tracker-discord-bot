import axios from "axios";

export default axios.create({
  baseURL: "https://vtvb79p6n2.execute-api.us-east-1.amazonaws.com/staging",
  headers: {
    "Content-type": "application/json",
  },
});
