const fs = require("fs");
const http = require("http");
const https = require("https");

const port = 3000;

const myServer = http.createServer();
myServer.on("request", requestHandler);
myServer.on("listening", listenHandler);
myServer.listen(port);

function listenHandler() {
  console.log(`Now Listening On Port #${port}`);
}

function requestHandler(req, res) {
  console.log(req.url);
  if (req.url === "/") {
    const html_form = fs.createReadStream("html/index.html"); // creates the read stream to read data from the user
    res.writeHead(200, { "Content-Type": "text/html" });
    html_form.pipe(res);
  } else if (req.url.startsWith("/search")) {
    const userInput = new URL(req.url, `https://${req.headers.host}`)
      .searchParams;
    console.log(userInput);
    const ip_address = userInput.get("IPAddress");
    if (ip_address == null || ip_address == "") {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>You did not provide any input</h1>");
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    get_IPGeolocation_data(ip_address);
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 Not Found</h1>");
  }

  function get_IPGeolocation_data(ip_address) {
    let api_key = "d09fd7fb1bf04f089c81a457733b4299";
    const geoAPI_endpoint = `https://api.ipgeolocation.io/ipgeo?apiKey=${api_key}&ip=${ip_address}`;
    const geoAPI_request = https.get(geoAPI_endpoint);
    geoAPI_request.once("response", geo_process_stream);
    function geo_process_stream(stream) {
      //readable stream: converts stream into JSON object
      let ip_geo = "";
      stream.on("data", (chunk) => (ip_geo += chunk));
      stream.on("end", () =>
        geoAPI_request.end(() => get_IPGeo_data(ip_geo, ip_address))
      );
    }
  }
  function get_IPGeo_data(ip_geo, ip_address) {
    const IP_endpoint = `https://api.techniknews.net/ipgeo/${ip_address}`;
    const IP_request = https.get(IP_endpoint);
    IP_request.once("response", ip_process_stream);
    function ip_process_stream(stream) {
      //readable stream
      let ip = "";
      stream.on("data", (chunk) => (ip += chunk));
      stream.on("end", () =>
        IP_request.end(() => parse_ip_geoloc_results(ip, ip_geo))
      );
    }
  }
  function parse_ip_geoloc_results(ip, ip_geo) {
    const ip_geo_lookup = JSON.parse(ip_geo); // parse JSON object into readable String
    //optional chaining
    let network_org = ip_geo_lookup?.organization;
    let city = ip_geo_lookup?.city;
    let currency_type = ip_geo_lookup?.currency?.name;

    let geo_results = `<div style="width:49%; float:left;"><h1>Geolocation Search Results: </h1><h2><ul><li>Network Organization: ${network_org}</li><li>City: ${city}</li><li>Currency Used: ${currency_type}</li></ul></h2></div>`;

    res.write(geo_results.padEnd(1024, ""), () => parse_ip_geo_results(ip));
    function parse_ip_geo_results(ip) {
      // IP-addresses that start with "1" makes this API to return "error"
      const ip_lookup = JSON.parse(ip);
      let timezone = ip_lookup?.timezone;
      let continent = ip_lookup?.continent;
      let ip_results = `<div style="width:49%; float:right;"><h1>IP Search Results: </h1><h2><ul><li>Continent: ${continent}</li><li>Timezone: ${timezone}</li></ul></h2></div>`;
      res.end(ip_results);
    }
  }
}
