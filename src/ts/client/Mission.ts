/// <reference path="./typings/tsd.d.ts" />

import $ = require('jquery');
import Hull3 = require('./Hull3');
import Settings = require('./Settings');

import {Side, MissionType, Terrain, Faction, Addons, Mission, Config, GeneratedMission, missionTypeToString, sideToString, getSides, getMissionTypes} from '../common/Mission';
export {Side, MissionType, Terrain, Faction, Addons, Mission, Config, GeneratedMission, missionTypeToString, sideToString, getSides, getMissionTypes} from '../common/Mission';

var MISSION_PATH = `${Settings.CONTEXT_PATH}/mission`;

var terrains: Terrain[] = [];

export function getTerrains(): Terrain[] {
    return terrains;
}

export function getMissionConfig(done: (config: Config) => void) {
    return $.get(`${MISSION_PATH}/config`).done(config => {
        done(<Config>config);
    });
}

export function getGeneratePath(): string {
    return `${MISSION_PATH}/generate`;
}

export function getDownloadPath(id: number, zip: string): string {
    return `${getGeneratePath()}/${id}/${zip}`;
}

export function updateFromConfig(config: Config) {
    terrains = config.terrains;
}
