const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
module.exports = app;
app.use(express.json());
const db_path = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initalizeDbAndServer = async () => {
  try {
    db = await open({
      filename: db_path,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server is Running!");
    });
  } catch (error) {
    console.log(`Database Error ${error.message}`);
  }
};
initalizeDbAndServer();

//Authentication with Token

const authentication = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "suhail", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//API 1

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const userDetails = await db.get(getUserQuery);
  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userDetails.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "suhail");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 2

app.get("/states/", authentication, async (request, response) => {
  const getAllStatesQuery = `SELECT state_id AS stateId, state_name AS stateName, population AS population FROM state;`;
  const statesList = await db.all(getAllStatesQuery);
  response.send(statesList);
});

//API 3

app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const getStateDetailsQuery = `SELECT state_id AS stateId, state_name AS stateName, population AS population
    FROM state WHERE state_id=${stateId};`;
  const stateDetails = await db.get(getStateDetailsQuery);
  response.send(stateDetails);
});

//API 4

app.post("/districts/", authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const insertDistrictDetails = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(insertDistrictDetails);
  response.send("District Successfully Added");
});

//API 5

app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `SELECT district_id AS districtId,district_name AS districtName,state_id AS stateId,cases AS cases,cured AS cured, active AS active,deaths AS deaths
    FROM district WHERE district_id=${districtId};`;
    const districtDetails = await db.get(getDistrictQuery);
    response.send(districtDetails);
  }
);

//API 6

app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id=${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//API 7
app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDetailsQuery = `UPDATE district SET district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths}
    WHERE district_id=${districtId};`;
    await db.run(updateDetailsQuery);
    response.send("District Details Updated");
  }
);

//API 8
app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const totalStatisticsQuery = `SELECT SUM(cases)AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,
  SUM(deaths) AS totalDeaths FROM state INNER JOIN district ON state.state_id=district.state_id
  WHERE state.state_id=${stateId};`;
    const totalStatistics = await db.get(totalStatisticsQuery);
    response.send(totalStatistics);
  }
);
