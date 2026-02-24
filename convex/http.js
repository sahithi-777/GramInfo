import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { householdPublic } from "./public";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({
  path: "/household",
  method: "GET",
  handler: householdPublic,
});

export default http;
