/// <reference path="./typings/tsd.d.ts" />

import express = require('express');
import bodyParser = require('body-parser');
import Settings = require('./Settings');
import Hull3 = require('./Hull3');
import Mission = require('./Mission');
import fs = require('fs-extra');
import cp = require('child_process');
import mime = require('mime');

function registerRoutes(app: express.Express) {
    app.get(Settings.CONTEXT_PATH, (request, response) => {
        response.sendFile(Settings.PATH.CLIENT_RESOURCES_HOME + '/index.html');
    });
    
    app.route(Settings.CONTEXT_PATH + '/mission/generate').post((request, response) => {
        generateMission(request, response);
    });
    app.route(Settings.CONTEXT_PATH + '/mission/generate/:id/:zip').get((request, response) => {
        sendMission(request, response, request.params.id, request.params.zip);
    });
    app.route(Settings.CONTEXT_PATH + '/mission/config').get((request, response) => {
        response.json(Mission.getMissionConfig());
    });
    app.route(Settings.CONTEXT_PATH + '/mission/side').get((request, response) => {
        response.json(Mission.getSideNames());
    });
    app.route(Settings.CONTEXT_PATH + '/mission/type').get((request, response) => {
        response.json(Mission.getMissionTypeNames());
    });
    app.route(Settings.CONTEXT_PATH + '/mission/terrain').get((request, response) => {
        response.json(Mission.getTerrains());
    });
    
    app.route(Settings.CONTEXT_PATH + '/hull3/faction').get((request, response) => {
        response.json(Hull3.getFactions());
    });
    app.route(Settings.CONTEXT_PATH + '/hull3/faction/update').post((request, response) => {
        Hull3.updateFactions();
        response.sendStatus(200);
    });
    
    app.route(Settings.CONTEXT_PATH + '/hull3/gear').get((request, response) => {
        response.json(Hull3.getGearTemplates());
    });
    app.route(Settings.CONTEXT_PATH + '/hull3/gear/update').post((request, response) => {
        Hull3.updateGearTemplates();
        response.sendStatus(200);
    });
    
    // Uniform
    app.route(Settings.CONTEXT_PATH + '/hull3/uniform').get((request, response) => {
        response.json(Hull3.getUniformTemplates());
    });
    app.route(Settings.CONTEXT_PATH + '/hull3/uniform/update').post((request, response) => {
        Hull3.updateUniformTemplates();
        response.sendStatus(200);
    });
}

function generateMission(request, response) {
    var mission = request.body;
    mission.briefingName = mission.briefingName.replace(/[^a-z0-9_]*/g, '');
    var generatedMission = Mission.generateMission(mission);
    var missionZipName = zipMission(generatedMission.missionDir, generatedMission.missionDirName);
    response.json({ id: generatedMission.missionId, zip: missionZipName });
}

function sendMission(request, response, missionId, missionZip) {
    var missionWorkingDir = `${Settings.PATH.Mission.WORKING_DIR}/${missionId}`;
    var missionZipPath = `${missionWorkingDir}/${missionZip}`;
    response.setHeader('Content-disposition', `attachment; filename=${missionZip}`);
    response.setHeader('Content-type', mime.lookup(missionZipPath));
    response.sendFile(missionZipPath, { root: './' }, () => removeMissionWorkingDir(missionWorkingDir) );
}

// Horrible way to do this. We only allow alphanum and underscroe, so no remote code execution shouldn't happen?.
// Sadly I haven't found a JS module that can zip a folder the way I want ...
function zipMission(missionDir: string, missionDirName: string): string {
    var missionZipName = `${missionDirName}.zip`,
        missionZip = `${missionDir}.zip`;
    var zipCommand = `7z a ${missionZip} ./${missionDir}/*`;
    if (process.platform === 'linux') {
        zipCommand = `(cd ${missionDir} ; zip -r ${missionZipName} . ; mv ${missionZipName} .. ; cd -)`;
    }
    cp.execSync(zipCommand);
    return missionZipName;
}

function removeMissionWorkingDir(missionWorkingDir: string) {
    fs.removeSync(missionWorkingDir);
}

export function start() {
    if (process.platform !== 'linux' && process.platform !== 'win32') { throw 'Unsupported platform!' }

    var app = express();
    app.use(Settings.CONTEXT_PATH, express.static(Settings.PATH.CLIENT_RESOURCES_HOME));
    app.use(bodyParser.json());

    registerRoutes(app);

    var server = app.listen(Settings.PORT, () => {
        console.log(`Shipyard is listening in port ${server.address().port}.`);
    });
}
