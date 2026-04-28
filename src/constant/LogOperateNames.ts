'use strict';

import { LogOperate } from './LogOperate';

export const LogOperateNames: string[] = [];

// --- Déverrouillages ---
LogOperateNames[LogOperate.OPERATE_TYPE_MOBILE_UNLOCK] = 'Déverrouillage Bluetooth';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK] = 'Déverrouillage par code';
LogOperateNames[LogOperate.OPERATE_TYPE_USE_DELETE_CODE] = 'Déverrouillage par code à usage unique (efface les anciens)';
LogOperateNames[LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED] = 'Déverrouillage bracelet Bong';
LogOperateNames[LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED] = 'Déverrouillage empreinte';
LogOperateNames[LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED] = 'Déverrouillage carte IC';
LogOperateNames[LogOperate.OPERATE_KEY_UNLOCK] = 'Déverrouillage clé mécanique';
LogOperateNames[LogOperate.GATEWAY_UNLOCK] = 'Déverrouillage passerelle';
LogOperateNames[LogOperate.ILLAGEL_UNLOCK] = 'Déverrouillage illégal (effraction)';
LogOperateNames[LogOperate.DOOR_SENSOR_UNLOCK] = 'Ouverture capteur de porte';
LogOperateNames[LogOperate.DOOR_GO_OUT] = 'Passage sortie enregistré';
LogOperateNames[LogOperate.REMOTE_CONTROL_KEY] = 'Déverrouillage télécommande';
LogOperateNames[LogOperate.WIRELESS_KEY_FOB] = 'Déverrouillage télécommande sans fil';

// --- Verrouillages ---
LogOperateNames[LogOperate.OPERATE_BLE_LOCK] = 'Verrouillage Bluetooth / réseau';
LogOperateNames[LogOperate.DOOR_SENSOR_LOCK] = 'Verrouillage capteur de porte';
LogOperateNames[LogOperate.FR_LOCK] = 'Verrouillage empreinte';
LogOperateNames[LogOperate.PASSCODE_LOCK] = 'Verrouillage code';
LogOperateNames[LogOperate.IC_LOCK] = 'Verrouillage carte IC';
LogOperateNames[LogOperate.OPERATE_KEY_LOCK] = 'Verrouillage clé mécanique';

// --- Échecs ---
LogOperateNames[LogOperate.OPERATE_TYPE_ERROR_PASSWORD_UNLOCK] = 'Code incorrect';
LogOperateNames[LogOperate.OPERATE_TYPE_PASSCODE_EXPIRED] = 'Code expiré';
LogOperateNames[LogOperate.OPERATE_TYPE_SPACE_INSUFFICIENT] = 'Déverrouillage échoué – stockage insuffisant';
LogOperateNames[LogOperate.OPERATE_TYPE_PASSCODE_IN_BLACK_LIST] = 'Déverrouillage échoué – code en liste noire';
LogOperateNames[LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED] = 'Échec déverrouillage empreinte';
LogOperateNames[LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED] = 'Échec déverrouillage carte IC (expirée ou invalide)';
LogOperateNames[LogOperate.PASSCODE_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage code – porte bloquée';
LogOperateNames[LogOperate.IC_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage carte IC – porte bloquée';
LogOperateNames[LogOperate.FR_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage empreinte – porte bloquée';
LogOperateNames[LogOperate.APP_UNLOCK_FAILED_LOCK_REVERSE] = 'Échec déverrouillage app – porte bloquée';

// --- Gestion codes ---
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD] = 'Modification de code';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD] = "Suppression d'un code";
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS] = 'Suppression de tous les codes';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED] = 'Code remplacé (capacité maximale atteinte)';
LogOperateNames[LogOperate.ADD_ADMIN_BY_KEYBOARD] = 'Code administrateur défini via clavier (initialisation)';

// --- Gestion cartes IC ---
LogOperateNames[LogOperate.OPERATE_TYPE_ADD_IC] = 'Ajout carte IC';
LogOperateNames[LogOperate.OPERATE_TYPE_DELETE_IC_SUCCEED] = "Suppression d'une carte IC";
LogOperateNames[LogOperate.OPERATE_TYPE_CLEAR_IC_SUCCEED] = 'Suppression de toutes les cartes IC';

// --- Gestion empreintes ---
LogOperateNames[LogOperate.OPERATE_TYPE_ADD_FR] = 'Ajout empreinte';
LogOperateNames[LogOperate.OPERATE_TYPE_DELETE_FR_SUCCEED] = "Suppression d'une empreinte";
LogOperateNames[LogOperate.OPERATE_TYPE_CLEAR_FR_SUCCEED] = 'Suppression de toutes les empreintes';

// --- Périphériques sans fil ---
LogOperateNames[LogOperate.WIRELESS_KEY_PAD] = 'Clavier sans fil (batterie)';

// --- Alarmes ---
LogOperateNames[LogOperate.TAMPER_ALARM] = 'Alarme anti-sabotage';
LogOperateNames[LogOperate.LOW_BATTERY_ALARM] = 'Alarme batterie faible';
LogOperateNames[LogOperate.DOOR_NOT_LOCKED_ALARM] = 'Alarme porte non verrouillée';
LogOperateNames[LogOperate.DOOR_OPENED_ALARM] = 'Alarme porte ouverte';
LogOperateNames[LogOperate.DOOR_SENSOR_ANOMALY] = 'Anomalie capteur de porte';
LogOperateNames[LogOperate.KEYBOARD_LOCKED] = 'Clavier bloqué (trop de tentatives erronées)';

// --- Système ---
LogOperateNames[LogOperate.OPERATE_TYPE_DOOR_REBOOT] = 'Redémarrage de la serrure (batterie reconnectée)';
LogOperateNames[LogOperate.RESET_BUTTON] = 'Bouton de réinitialisation pressé';
