import axios from "axios";

export default axios.create({
  baseURL: "https://v4mps60z1i.execute-api.us-east-1.amazonaws.com/dev",
  headers: {
    "Content-type": "application/json",
  },
});
