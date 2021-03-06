/// <reference path="./typings/tsd.d.ts" />

import $ = require('jquery');
import _ = require('lodash');
import Hull3 = require('./Hull3');
import Mission = require('./Mission');

var factionIdCounter = 0; 
var TERRAIN_FIELD: JQuery = null,
    MISSION_TYPE_FIELD: JQuery = null,
    ON_LOAD_NAME_FIELD: JQuery = null,
    AUTHOR_FIELD: JQuery = null,
    BRIEFING_NAME_FIELD: JQuery = null,
    OVERVIEW_TEXT_FIELD: JQuery = null,
    FACTION_SELECT_FIELD_TEMPLATE: _.TemplateExecutor = null,
    FACTION_GROUPS_TEMPLATE: _.TemplateExecutor = null,
    FACTION_VEHICLE_CLASSNAME_FIELDS_TEMPLATE: _.TemplateExecutor = null,
    ADD_FACTION_BUTTON: JQuery = null,
    FACIONS_CONTAINER: JQuery = null,
    ADMIRAL_FIELD: JQuery = null,
    PLANK_FIELD: JQuery = null,
    GENERATE_MISSION_BUTTON: JQuery = null,
    DOWNLOAD_MISSION_FORM: JQuery = null;

interface Option {
    value: string;
    text: string;
}

function nextFactionId(): number {
    factionIdCounter = factionIdCounter + 1;
    return factionIdCounter;
}

function initMissionFields(terrains: Mission.Terrain[], missionTypes: Mission.MissionType[]) {
    TERRAIN_FIELD = $('#terrain').eq(0);
    MISSION_TYPE_FIELD = $('#missionType').eq(0);
    ON_LOAD_NAME_FIELD = $('#onLoadName').eq(0);
    AUTHOR_FIELD = $('#author').eq(0);
    BRIEFING_NAME_FIELD = $('#briefingName').eq(0);
    OVERVIEW_TEXT_FIELD = $('#overviewText').eq(0);

    initSelectField(TERRAIN_FIELD, terrains.map(terrainToOption));
    initSelectField(MISSION_TYPE_FIELD, missionTypes.map(missionTypeToOption));
}

function initFactions() {
    FACTION_SELECT_FIELD_TEMPLATE = _.template($('#faction-select-field-template').html());
    FACTION_GROUPS_TEMPLATE = _.template($('#faction-groups-template').html());
    FACTION_VEHICLE_CLASSNAME_FIELDS_TEMPLATE = _.template($('#faction-vehicle-classname-fields-template').html());
    ADD_FACTION_BUTTON = $('#add-faction').eq(0);
    FACIONS_CONTAINER = $('#factions').eq(0);
    ADD_FACTION_BUTTON.click(() => { addFaction(FACIONS_CONTAINER); });
}

function terrainToOption(t: Mission.Terrain): Option {
    return { value: t.id, text: t.name }    
}

function missionTypeToOption(mt: Mission.MissionType): Option {
    return {
        value: Mission.missionTypeToString(mt),
        text: Mission.missionTypeToString(mt)
    }    
}

function sideToOption(s: Mission.Side): Option {
    return {
        value: Mission.sideToString(s),
        text: Mission.sideToString(s)
    }
}

function factionToOption(f: Hull3.Faction): Option {
    return { value: f.id, text: f.name }    
}

function templateToOption(t: Hull3.Template): Option {
    return { value: t.id, text: t.name }    
}

function initSelectField(field: JQuery, options: Option[], selectedValue?: string) {
    field.empty();
    options.forEach(o => {
        field.append(`<option value="${o.value}" ${selectedValue && o.value == selectedValue ? 'selected="selected"' : ''}>${o.text}</option>`);
    });
}

function addFaction(container: JQuery) {
    var factionId = nextFactionId();
    var factionContainer = $(`<div class="faction-container"></div>`),
        factionFieldContainer = $(`<div class="faction-field-container"></div>`),
        factionField = $(FACTION_SELECT_FIELD_TEMPLATE({
            factionId: factionId,
            fieldClass: 'faction',
            label: 'Faction',
            options: Hull3.getFactions().map(factionToOption),
            selectedValue: ''
        })),
        sideField = $(FACTION_SELECT_FIELD_TEMPLATE({
            factionId: factionId,
            fieldClass: 'side',
            label: 'Side',
            options: Mission.getSides().map(sideToOption),
            selectedValue: ''
        })),
        gearField = $(FACTION_SELECT_FIELD_TEMPLATE({
            factionId: factionId,
            fieldClass: 'gearTemplate',
            label: 'Gear template',
            options: Hull3.getGearTemplates().map(templateToOption),
            selectedValue: ''
        })),
        uniformField = $(FACTION_SELECT_FIELD_TEMPLATE({
            factionId: factionId,
            fieldClass: 'uniformTemplate',
            label: 'Uniform template',
            options: Hull3.getUniformTemplates().map(templateToOption),
            selectedValue: ''
        })),
        removeFooter = $(`<div class="remove-footer"></div>`),
        removeButton = $(`<button class="remove-button">Remove</button>`);
    factionFieldContainer.append(factionField);
    factionFieldContainer.append(sideField);
    factionFieldContainer.append(gearField);
    factionFieldContainer.append(uniformField);
    factionContainer.append(factionFieldContainer);
    addGroups(factionContainer, factionId);
    addVehicleClassnames(factionContainer, factionId);
    removeButton.click(() => { factionContainer.remove(); });
    removeFooter.append(removeButton);
    removeFooter.append($('<div style="clear: both;"></div>'));
    factionContainer.append(removeFooter);
    container.append(factionContainer);
    addFactionChangeHandling(factionContainer, Hull3.getFactionConfigs());
    factionField.find('select.faction').trigger('change');
}

function addFactionChangeHandling(factionContainer: JQuery, factionConfigs: { [id: string]: Hull3.FactionConfig }) {
    factionContainer.find('select.faction').change(e => {
        var selectedFactionId = $(e.target).find(':selected').val();
        var faction = Hull3.getFactionById(selectedFactionId),
            vehicleClassnames = factionConfigs[selectedFactionId].vehicleClassnames;
        factionContainer.find('select.gearTemplate').val(faction.gearTemplateId);
        factionContainer.find('select.uniformTemplate').val(faction.uniformTemplateId);
        factionContainer.find('input.vehicle-classname').each((idx, el) => {
            $(el).val(vehicleClassnames[$(el).data('id')]);
        });
    });
}

function addGroups(container: JQuery, factionId: number) {
    var factionGroups = $(FACTION_GROUPS_TEMPLATE({
            factionId: factionId,
            groupings: _.groupBy(Hull3.getGroupTemplates(), 'groupingId')
        }));
    container.append($('<h4 class="before">Groups</h4>'));
    container.append(factionGroups);
    factionGroups.find('.faction-grouping').each((idx, fg) => {
        $(fg).find('.grouping-select').click(e => {
            checkGroups($(e.target), $(fg).find('input'));
        });
    });
}

function checkGroups(button: JQuery, checkboxes: JQuery) {
    var newState = 'none',
        oldState = 'all',
        newCheckState = false;
    if (button.hasClass('none')) {
        newState = 'all';
        oldState = 'none';
        newCheckState = true;
    }
    button.addClass(newState).removeClass(oldState);
    checkboxes.prop('checked', newCheckState);
}

function addVehicleClassnames(container: JQuery, factionId: number) {
    var factionVehicleClassnameFields = FACTION_VEHICLE_CLASSNAME_FIELDS_TEMPLATE({
            factionId: factionId,
            vehicleClassnameTemplates: Hull3.getVehicleClassnameTemplates()
        });
    container.append($('<h4 class="before small">Vehicle classnames</h4>'));
    container.append(factionVehicleClassnameFields);
}

function getSelectedFactions(): Hull3.FactionRequest[] {
    return FACIONS_CONTAINER.find('.faction-container').map((idx, container) => {
        var ffcChildren = $(container).find('.faction-field-container').children();
        return {
            factionId: ffcChildren.eq(0).find('select :selected').val(),
            sideName: ffcChildren.eq(1).find('select :selected').val(),
            gearTemplateId: ffcChildren.eq(2).find('select :selected').val(),
            uniformTemplateId: ffcChildren.eq(3).find('select :selected').val(),
            groupTemplateIds: getSelectedGroupTemplateIds($(container)),
            vehicleClassnames: getVehicleClassnames($(container))
        } 
    }).toArray();
}

function getSelectedGroupTemplateIds(container: JQuery): string[] {
    var groups = container.find('input.group-template').map((idx, inp) => {
        return {
            id: $(inp).data('id'),
            checked: $(inp).prop('checked')
        }
    }).toArray();
    return _.pluck(_.filter(groups, 'checked'), 'id');
}

function getVehicleClassnames(container: JQuery): { [id: string]: string } {
    var vehicleClassnames = container.find('input.vehicle-classname').map((idx, inp) => {
        return {
            id: $(inp).data('id'),
            classname: $(inp).val()
        }
    }).toArray();
    return _.foldl(vehicleClassnames, (res, vcn) => {
        res[vcn.id] = vcn.classname;
        return res;
    }, <{ [id: string]: string }>{});
}

function initAddons() {
    ADMIRAL_FIELD = $('#admiral').eq(0);
    PLANK_FIELD = $('#plank').eq(0);
}

function initGenerateMission() {
    GENERATE_MISSION_BUTTON = $('#generate-mission').eq(0);
    GENERATE_MISSION_BUTTON.click(generateMission);
    DOWNLOAD_MISSION_FORM = $('#download-mission').eq(0);
}

function getMission(): Mission.Mission {
    return {
        terrainId: TERRAIN_FIELD.find(':selected').val(),
        missionTypeName: MISSION_TYPE_FIELD.find(':selected').val(),
        onLoadName: ON_LOAD_NAME_FIELD.val(),
        author: AUTHOR_FIELD.val(),
        briefingName: BRIEFING_NAME_FIELD.val(),
        overviewText: OVERVIEW_TEXT_FIELD.val(),
        factions: getSelectedFactions(),
        addons: {
            admiral: ADMIRAL_FIELD.prop('checked'),
            plank: PLANK_FIELD.prop('checked')
        }
    }
}

function generateMission() {
    var mission = getMission();
    console.log(mission);
    $.ajax({
        url: Mission.getGeneratePath(),
        method: 'POST',
        dataType: 'json',
        contentType: "application/json",
        data: JSON.stringify(mission),
        processData: false
    }).done(generatedMission => {
        DOWNLOAD_MISSION_FORM.attr('action', Mission.getDownloadPath(generatedMission.id, generatedMission.zip));
        DOWNLOAD_MISSION_FORM.submit();
    }); 
}

export function init() {
    initMissionFields(Mission.getTerrains(), Mission.getMissionTypes());
    initFactions();
    initAddons();
    initGenerateMission();
}