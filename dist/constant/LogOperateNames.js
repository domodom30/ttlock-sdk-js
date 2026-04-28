'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogOperateNames = void 0;
const LogOperate_1 = require("./LogOperate");
exports.LogOperateNames = [];
// --- Déverrouillages ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_MOBILE_UNLOCK] = 'Déverrouillage Bluetooth';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK] = 'Déverrouillage par code';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_USE_DELETE_CODE] = 'Déverrouillage par code à usage unique (efface les anciens)';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED] = 'Déverrouillage bracelet Bong';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED] = 'Déverrouillage empreinte';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED] = 'Déverrouillage carte IC';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_KEY_UNLOCK] = 'Déverrouillage clé mécanique';
exports.LogOperateNames[LogOperate_1.LogOperate.GATEWAY_UNLOCK] = 'Déverrouillage passerelle';
exports.LogOperateNames[LogOperate_1.LogOperate.ILLAGEL_UNLOCK] = 'Déverrouillage illégal (effraction)';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_SENSOR_UNLOCK] = 'Ouverture capteur de porte';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_GO_OUT] = 'Passage sortie enregistré';
exports.LogOperateNames[LogOperate_1.LogOperate.REMOTE_CONTROL_KEY] = 'Déverrouillage télécommande';
exports.LogOperateNames[LogOperate_1.LogOperate.WIRELESS_KEY_FOB] = 'Déverrouillage télécommande sans fil';
// --- Verrouillages ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_BLE_LOCK] = 'Verrouillage Bluetooth / réseau';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_SENSOR_LOCK] = 'Verrouillage capteur de porte';
exports.LogOperateNames[LogOperate_1.LogOperate.FR_LOCK] = 'Verrouillage empreinte';
exports.LogOperateNames[LogOperate_1.LogOperate.PASSCODE_LOCK] = 'Verrouillage code';
exports.LogOperateNames[LogOperate_1.LogOperate.IC_LOCK] = 'Verrouillage carte IC';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_KEY_LOCK] = 'Verrouillage clé mécanique';
// --- Échecs ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_ERROR_PASSWORD_UNLOCK] = 'Code incorrect';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_PASSCODE_EXPIRED] = 'Code expiré';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_SPACE_INSUFFICIENT] = 'Déverrouillage échoué – stockage insuffisant';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_PASSCODE_IN_BLACK_LIST] = 'Déverrouillage échoué – code en liste noire';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED] = 'Échec déverrouillage empreinte';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED] = 'Échec déverrouillage carte IC (expirée ou invalide)';
exports.LogOperateNames[LogOperate_1.LogOperate.PASSCODE_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage code – porte bloquée';
exports.LogOperateNames[LogOperate_1.LogOperate.IC_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage carte IC – porte bloquée';
exports.LogOperateNames[LogOperate_1.LogOperate.FR_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage empreinte – porte bloquée';
exports.LogOperateNames[LogOperate_1.LogOperate.APP_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage app – porte bloquée';
// --- Gestion codes ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD] = 'Modification de code';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD] = "Suppression d'un code";
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS] = 'Suppression de tous les codes';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED] = 'Code remplacé (capacité maximale atteinte)';
exports.LogOperateNames[LogOperate_1.LogOperate.ADD_ADMIN_BY_KEYBOARD] = 'Code administrateur défini via clavier (initialisation)';
// --- Gestion cartes IC ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_ADD_IC] = 'Ajout carte IC';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_DELETE_IC_SUCCEED] = "Suppression d'une carte IC";
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_CLEAR_IC_SUCCEED] = 'Suppression de toutes les cartes IC';
// --- Gestion empreintes ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_ADD_FR] = 'Ajout empreinte';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_DELETE_FR_SUCCEED] = "Suppression d'une empreinte";
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_CLEAR_FR_SUCCEED] = 'Suppression de toutes les empreintes';
// --- Périphériques sans fil ---
exports.LogOperateNames[LogOperate_1.LogOperate.WIRELESS_KEY_PAD] = 'Clavier sans fil (batterie)';
// --- Alarmes ---
exports.LogOperateNames[LogOperate_1.LogOperate.TAMPER_ALARM] = 'Alarme anti-sabotage';
exports.LogOperateNames[LogOperate_1.LogOperate.LOW_BATTERY_ALARM] = 'Alarme batterie faible';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_NOT_LOCKED_ALARM] = 'Alarme porte non verrouillée';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_OPENED_ALARM] = 'Alarme porte ouverte';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_SENSOR_ANOMALY] = 'Anomalie capteur de porte';
exports.LogOperateNames[LogOperate_1.LogOperate.KEYBOARD_LOCKED] = 'Clavier bloqué (trop de tentatives erronées)';
// --- Système ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_DOOR_REBOOT] = 'Redémarrage de la serrure (batterie reconnectée)';
exports.LogOperateNames[LogOperate_1.LogOperate.RESET_BUTTON] = 'Bouton de réinitialisation pressé';
